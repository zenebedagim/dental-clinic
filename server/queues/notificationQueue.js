/**
 * Notification Queue Configuration
 * Simplified version without Redis/BullMQ
 * Notifications are sent directly
 */

let notificationQueue = null;

/**
 * Add notification job (no-op without queue)
 * Notifications are sent directly by notification service
 */
const addNotificationJob = async (notificationData) => {
  // Queue not available - notifications sent directly
  return null;
};

/**
 * Add delayed notification job (no-op without queue)
 */
const addDelayedNotificationJob = async (notificationData, delayMs) => {
  // Queue not available - notifications sent directly
  return null;
};

/**
 * Get queue statistics (empty stats without queue)
 */
const getQueueStats = async () => {
  return {
    waiting: 0,
    active: 0,
    completed: 0,
    failed: 0,
    delayed: 0,
    total: 0,
  };
};

/**
 * Clean queue (no-op without queue)
 */
const cleanQueue = async () => {
  // No queue to clean
};

module.exports = {
  notificationQueue,
  addNotificationJob,
  addDelayedNotificationJob,
  getQueueStats,
  cleanQueue,
};
