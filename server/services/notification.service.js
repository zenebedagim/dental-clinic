/**
 * Notification Service
 * Centralized notification management with ACK, offline queue, priority handling
 */

const { randomUUID } = require('crypto');
const prisma = require('../config/db');
const {
  NotificationType,
  NotificationPriority,
  getPriority,
  getActionUrl,
  getDefaultTitle,
  requiresAck: requiresAckFn,
  getAckTimeout,
  getMaxRetries,
} = require('../utils/notificationTypes');
const { logSent, logDelivered, logFailed, logEscalated } = require('./notificationLogger.service');
const metricsService = require('./notificationMetrics.service');
const { addNotificationJob, addDelayedNotificationJob } = require('../queues/notificationQueue');

// Socket.io instance (will be set by socketServer)
let io = null;
let userSocketMap = new Map(); // userId -> Set of socketIds

/**
 * Set Socket.io instance
 */
const setSocketIO = (socketIO) => {
  io = socketIO;
};

/**
 * Register user socket mapping
 */
const registerUserSocket = (userId, socketId) => {
  if (!userSocketMap.has(userId)) {
    userSocketMap.set(userId, new Set());
  }
  userSocketMap.get(userId).add(socketId);
};

/**
 * Unregister user socket mapping
 */
const unregisterUserSocket = (userId, socketId) => {
  if (userSocketMap.has(userId)) {
    userSocketMap.get(userId).delete(socketId);
    if (userSocketMap.get(userId).size === 0) {
      userSocketMap.delete(userId);
    }
  }
};

/**
 * Check if user is online
 */
const isUserOnline = (userId) => {
  return userSocketMap.has(userId) && userSocketMap.get(userId).size > 0;
};

/**
 * Get user socket IDs
 */
const getUserSockets = (userId) => {
  return Array.from(userSocketMap.get(userId) || []);
};

/**
 * Check user notification preferences
 */
const checkUserPreferences = async (userId, notificationType) => {
  try {
    const preference = await prisma.notificationPreference.findUnique({
      where: {
        userId_notificationType: {
          userId,
          notificationType,
        },
      },
    });

    // If preference exists and disabled, return false
    if (preference && !preference.enabled) {
      return false;
    }

    // Check do not disturb
    if (preference && preference.doNotDisturb) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
      
      if (preference.workHoursStart && preference.workHoursEnd) {
        if (currentTime < preference.workHoursStart || currentTime > preference.workHoursEnd) {
          return false; // Outside work hours
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking user preferences:', error);
    return true; // Default to enabled if error
  }
};

/**
 * Check authorization
 */
const checkAuthorization = async (userId, targetUserId, targetRole, targetBranchId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, branchId: true },
    });

    if (!user) {
      return false;
    }

    // If targeting specific user, check if it's the same user or admin
    if (targetUserId && targetUserId !== userId && user.role !== 'ADMIN') {
      return false;
    }

    // If targeting role, check if user has that role or is admin
    if (targetRole && user.role !== targetRole && user.role !== 'ADMIN') {
      return false;
    }

    // If targeting branch, check if user belongs to that branch or is admin
    if (targetBranchId && user.branchId !== targetBranchId && user.role !== 'ADMIN') {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error checking authorization:', error);
    return false;
  }
};

/**
 * Store notification in database
 */
const storeNotification = async (notificationData) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: notificationData.userId,
        type: notificationData.type,
        priority: notificationData.priority,
        title: notificationData.title,
        message: notificationData.message,
        eventId: notificationData.eventId,
        version: notificationData.version || '1.0',
        data: notificationData.data || {},
        actionUrl: notificationData.actionUrl,
        requiresAck: notificationData.requiresAck || false,
        maxRetries: notificationData.maxRetries || 3,
        delivered: false,
        read: false,
        acknowledged: false,
      },
    });

    return notification;
  } catch (error) {
    console.error('Error storing notification:', error);
    throw error;
  }
};

/**
 * Store notification in offline queue (database)
 * Notifications are stored in database and delivered when user comes online
 */
const storeOfflineNotification = async (userId, notificationPayload) => {
  // Notifications are already stored in database
  // They will be delivered when user connects via Socket.io
  // No additional storage needed
};

/**
 * Send notification via Socket.io
 */
const sendViaSocket = async (userId, notificationPayload) => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }

  const socketIds = getUserSockets(userId);
  if (socketIds.length === 0) {
    return { delivered: false, reason: 'User offline' };
  }

  let delivered = false;
  for (const socketId of socketIds) {
    try {
      io.to(socketId).emit('notification', notificationPayload);
      delivered = true;
    } catch (error) {
      console.error(`Error sending to socket ${socketId}:`, error);
    }
  }

  return { delivered, socketCount: socketIds.length };
}

/**
 * Send notification (main method)
 */
const sendNotification = async (notificationData) => {
  const {
    userId,
    type,
    priority,
    title,
    message,
    eventId,
    data,
    actionUrl,
    requiresAck,
    maxRetries,
  } = notificationData;

  try {
    // Check authorization
    const authorized = await checkAuthorization(
      userId,
      userId, // targetUserId
      null, // targetRole
      null // targetBranchId
    );

    if (!authorized) {
      throw new Error('User not authorized to receive notification');
    }

    // Check user preferences
    const preferencesAllowed = await checkUserPreferences(userId, type);
    if (!preferencesAllowed) {
      return { skipped: true, reason: 'User preferences disabled' };
    }

    // Generate eventId if not provided
    const finalEventId = eventId || randomUUID();

    // Check for duplicate (idempotency)
    const existing = await prisma.notification.findUnique({
      where: { eventId: finalEventId },
    });

    if (existing) {
      return { notificationId: existing.id, duplicate: true };
    }

    // Determine priority if not provided
    const finalPriority = priority || getPriority(type);

    // Get action URL if not provided
    const finalActionUrl = actionUrl || getActionUrl(type, data);

    // Get title if not provided
    const finalTitle = title || getDefaultTitle(type);

    // Determine if ACK required
    const finalRequiresAck = requiresAck !== undefined ? requiresAck : requiresAckFn(finalPriority);

    // Get max retries
    const finalMaxRetries = maxRetries || getMaxRetries(finalPriority);

    // Create notification payload
    const notificationPayload = {
      id: randomUUID(), // Temporary ID, will be replaced with DB ID
      eventId: finalEventId,
      version: '1.0',
      type,
      priority: finalPriority,
      title: finalTitle,
      message,
      data: data || {},
      actionUrl: finalActionUrl,
      requiresAck: finalRequiresAck,
      timestamp: new Date().toISOString(),
    };

    // Store in database
    const notification = await storeNotification({
      userId,
      type,
      priority: finalPriority,
      title: finalTitle,
      message,
      eventId: finalEventId,
      data,
      actionUrl: finalActionUrl,
      requiresAck: finalRequiresAck,
      maxRetries: finalMaxRetries,
    });

    notificationPayload.id = notification.id;

    // Try to send via Socket.io
    const socketResult = await sendViaSocket(userId, notificationPayload);

    if (socketResult.delivered) {
      // Mark as delivered
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          delivered: true,
          deliveredAt: new Date(),
        },
      });

      await logDelivered(notification.id, {
        userId,
        type,
        priority: finalPriority,
      });

      metricsService.increment('totalDelivered');
      metricsService.recordDeliveryTime(Date.now() - new Date(notification.createdAt).getTime());

      // Set up ACK timeout if required
      if (finalRequiresAck) {
        const ackTimeout = getAckTimeout(finalPriority);
        if (ackTimeout) {
          setTimeout(async () => {
            const updated = await prisma.notification.findUnique({
              where: { id: notification.id },
            });

            if (updated && !updated.acknowledged) {
              // Retry or escalate
              if (updated.retryCount < finalMaxRetries) {
                // Retry
                await retryNotification(notification.id);
              } else if (finalPriority === NotificationPriority.CRITICAL) {
                // Escalate
                await escalateNotification(notification.id);
              }
            }
          }, ackTimeout);
        }
      }
    } else {
      // User is offline, store in offline queue
      await storeOfflineNotification(userId, notificationPayload);
    }

    return {
      notificationId: notification.id,
      eventId: finalEventId,
      delivered: socketResult.delivered,
    };
  } catch (error) {
    console.error('Error sending notification:', error);
    await logFailed(null, error, { userId, type, priority });
    throw error;
  }
};

/**
 * Retry notification
 */
const retryNotification = async (notificationId) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return;
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        retryCount: notification.retryCount + 1,
      },
    });

    // Resend notification
    const notificationPayload = {
      id: notification.id,
      eventId: notification.eventId,
      version: notification.version,
      type: notification.type,
      priority: notification.priority,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      actionUrl: notification.actionUrl,
      requiresAck: notification.requiresAck,
      timestamp: new Date().toISOString(),
    };

    const socketResult = await sendViaSocket(notification.userId, notificationPayload);

    if (socketResult.delivered) {
      await prisma.notification.update({
        where: { id: notificationId },
        data: {
          delivered: true,
          deliveredAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.error('Error retrying notification:', error);
  }
};

/**
 * Escalate notification
 */
const escalateNotification = async (notificationId) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      include: {
        user: {
          select: {
            branchId: true,
          },
        },
      },
    });

    if (!notification) {
      return;
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        escalated: true,
      },
    });

    await logEscalated(notificationId, {
      userId: notification.userId,
      type: notification.type,
    });

    metricsService.increment('totalEscalated');

    // Notify branch admin
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        branchId: notification.user.branchId,
      },
    });

    for (const admin of admins) {
      await notifyUser(admin.id, {
        type: NotificationType.APPOINTMENT_CANCELLED, // Use appropriate type
        priority: NotificationPriority.HIGH,
        title: 'Notification Escalation',
        message: `Critical notification for user ${notification.userId} was not acknowledged`,
        data: {
          originalNotificationId: notificationId,
        },
      });
    }
  } catch (error) {
    console.error('Error escalating notification:', error);
  }
};

/**
 * Notify single user
 */
const notifyUser = async (userId, notificationData) => {
  // Try to add to queue for background processing
  const job = await addNotificationJob({
    userId,
    ...notificationData,
  });

  // If queue is not available, send directly
  if (!job) {
    console.log("Queue not available, sending notification directly");
    return await sendNotification({
      userId,
      ...notificationData,
    });
  }

  return job;
};

/**
 * Notify users by role
 */
const notifyRole = async (role, branchId, notificationData) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role,
        ...(branchId && { branchId }),
      },
      select: { id: true },
    });

    const jobs = users.map(async (user) => {
      const job = await addNotificationJob({
        userId: user.id,
        ...notificationData,
      });
      // If queue is not available, send directly
      if (!job) {
        return await sendNotification({
          userId: user.id,
          ...notificationData,
        });
      }
      return job;
    });

    return await Promise.all(jobs);
  } catch (error) {
    console.error('Error notifying role:', error);
    throw error;
  }
};

/**
 * Notify users in branch
 */
const notifyBranch = async (branchId, notificationData) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        branchId,
      },
      select: { id: true },
    });

    const jobs = users.map(async (user) => {
      const job = await addNotificationJob({
        userId: user.id,
        ...notificationData,
      });
      // If queue is not available, send directly
      if (!job) {
        return await sendNotification({
          userId: user.id,
          ...notificationData,
        });
      }
      return job;
    });

    return await Promise.all(jobs);
  } catch (error) {
    console.error('Error notifying branch:', error);
    throw error;
  }
};

/**
 * Acknowledge notification
 */
const acknowledgeNotification = async (notificationId, userId) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new Error('Notification not found or unauthorized');
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        acknowledged: true,
        acknowledgedAt: new Date(),
      },
    });

    const { logAcknowledged } = require('./notificationLogger.service');
    await logAcknowledged(notificationId, { userId });

    metricsService.increment('totalAcknowledged');

    return { success: true };
  } catch (error) {
    console.error('Error acknowledging notification:', error);
    throw error;
  }
};

/**
 * Get pending notifications for user (from database)
 * Returns undelivered notifications for the user
 */
const getPendingNotifications = async (userId) => {
  try {
    // Get undelivered notifications from database
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        delivered: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to last 50 notifications
    });

    // Convert to notification payload format
    return notifications.map(notification => ({
      id: notification.id,
      eventId: notification.eventId,
      version: notification.version || '1.0',
      type: notification.type,
      priority: notification.priority,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      actionUrl: notification.actionUrl,
      requiresAck: notification.requiresAck,
      timestamp: notification.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error('Error getting pending notifications:', error);
    return [];
  }
};

module.exports = {
  setSocketIO,
  registerUserSocket,
  unregisterUserSocket,
  isUserOnline,
  sendNotification,
  notifyUser,
  notifyRole,
  notifyBranch,
  acknowledgeNotification,
  getPendingNotifications,
  retryNotification,
  escalateNotification,
};

