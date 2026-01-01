/**
 * Notification Controller
 * API endpoints for notification preferences and history
 */

const prisma = require("../config/db");
const { sendSuccess, sendError } = require("../utils/response.util");
const notificationService = require("../services/notification.service");

/**
 * Get user notifications
 */
const getUserNotifications = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { limit = 50, offset = 0, read, priority } = req.query;

    const where = {
      userId,
    };

    if (read !== undefined) {
      where.read = read === "true";
    }

    if (priority) {
      where.priority = priority;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.notification.count({ where }),
    ]);

    return sendSuccess(res, {
      notifications,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    console.error("Get user notifications error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Get unread notification count
 */
const getUnreadCount = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { priority } = req.query;

    const where = {
      userId,
      read: false,
    };

    if (priority) {
      where.priority = priority;
    }

    const count = await prisma.notification.count({ where });

    return sendSuccess(res, { count });
  } catch (error) {
    console.error("Get unread count error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { notificationId } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      return sendError(res, "Notification not found", 404);
    }

    if (notification.userId !== userId) {
      return sendError(res, "Unauthorized", 403);
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    const { logRead } = require("../services/notificationLogger.service");
    await logRead(notificationId, { userId });

    const metricsService = require("../services/notificationMetrics.service");
    metricsService.increment("totalRead");

    return sendSuccess(res, updated, 200, "Notification marked as read");
  } catch (error) {
    console.error("Mark as read error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res) => {
  try {
    const { id: userId } = req.user;

    const result = await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return sendSuccess(
      res,
      { count: result.count },
      200,
      "All notifications marked as read"
    );
  } catch (error) {
    console.error("Mark all as read error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Get user notification preferences
 */
const getPreferences = async (req, res) => {
  try {
    const { id: userId } = req.user;

    const preferences = await prisma.notificationPreference.findMany({
      where: { userId },
    });

    return sendSuccess(res, preferences);
  } catch (error) {
    console.error("Get preferences error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Update notification preference
 */
const updatePreference = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const {
      notificationType,
      enabled,
      soundEnabled,
      toastEnabled,
      workHoursStart,
      workHoursEnd,
      doNotDisturb,
    } = req.body;

    if (!notificationType) {
      return sendError(res, "Notification type is required", 400);
    }

    const preference = await prisma.notificationPreference.upsert({
      where: {
        userId_notificationType: {
          userId,
          notificationType,
        },
      },
      update: {
        enabled: enabled !== undefined ? enabled : undefined,
        soundEnabled: soundEnabled !== undefined ? soundEnabled : undefined,
        toastEnabled: toastEnabled !== undefined ? toastEnabled : undefined,
        workHoursStart:
          workHoursStart !== undefined ? workHoursStart : undefined,
        workHoursEnd: workHoursEnd !== undefined ? workHoursEnd : undefined,
        doNotDisturb: doNotDisturb !== undefined ? doNotDisturb : undefined,
      },
      create: {
        userId,
        notificationType,
        enabled: enabled !== undefined ? enabled : true,
        soundEnabled: soundEnabled !== undefined ? soundEnabled : true,
        toastEnabled: toastEnabled !== undefined ? toastEnabled : true,
        workHoursStart,
        workHoursEnd,
        doNotDisturb: doNotDisturb !== undefined ? doNotDisturb : false,
      },
    });

    return sendSuccess(res, preference, 200, "Preference updated successfully");
  } catch (error) {
    console.error("Update preference error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

/**
 * Acknowledge notification
 */
const acknowledgeNotification = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { notificationId } = req.params;

    const result = await notificationService.acknowledgeNotification(
      notificationId,
      userId
    );

    return sendSuccess(res, result, 200, "Notification acknowledged");
  } catch (error) {
    console.error("Acknowledge notification error:", error);
    return sendError(res, error.message || "Server error", 500, error);
  }
};

module.exports = {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreference,
  acknowledgeNotification,
};
