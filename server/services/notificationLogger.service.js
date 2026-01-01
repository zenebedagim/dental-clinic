/**
 * Notification Logger Service
 * Structured logging for all notification events
 */

const pino = require('pino');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create logger instance
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
}, pino.destination(path.join(logsDir, process.env.LOG_FILE || 'notifications.log')));

const NotificationLogEvent = {
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  READ: 'READ',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  FAILED: 'FAILED',
  ESCALATED: 'ESCALATED',
};

/**
 * Log notification event
 */
const logNotificationEvent = async (notificationId, event, metadata = {}) => {
  const logData = {
    notificationId,
    event,
    timestamp: new Date().toISOString(),
    ...metadata,
  };

  // Log to file
  logger.info(logData, `Notification ${event}: ${notificationId}`);

  // Also log to database if notificationId exists
  if (notificationId) {
    try {
      const prisma = require('../config/db');
      await prisma.notificationLog.create({
        data: {
          notificationId,
          event,
          metadata: metadata,
        },
      });
    } catch (error) {
      logger.error({ error, notificationId, event }, 'Failed to log notification event to database');
    }
  }
};

/**
 * Log notification sent
 */
const logSent = async (notificationId, metadata = {}) => {
  await logNotificationEvent(notificationId, NotificationLogEvent.SENT, metadata);
};

/**
 * Log notification delivered
 */
const logDelivered = async (notificationId, metadata = {}) => {
  await logNotificationEvent(notificationId, NotificationLogEvent.DELIVERED, metadata);
};

/**
 * Log notification read
 */
const logRead = async (notificationId, metadata = {}) => {
  await logNotificationEvent(notificationId, NotificationLogEvent.READ, metadata);
};

/**
 * Log notification acknowledged
 */
const logAcknowledged = async (notificationId, metadata = {}) => {
  await logNotificationEvent(notificationId, NotificationLogEvent.ACKNOWLEDGED, metadata);
};

/**
 * Log notification failed
 */
const logFailed = async (notificationId, error, metadata = {}) => {
  await logNotificationEvent(notificationId, NotificationLogEvent.FAILED, {
    ...metadata,
    error: error?.message || String(error),
    stack: error?.stack,
  });
};

/**
 * Log notification escalated
 */
const logEscalated = async (notificationId, metadata = {}) => {
  await logNotificationEvent(notificationId, NotificationLogEvent.ESCALATED, metadata);
};

module.exports = {
  logger,
  NotificationLogEvent,
  logNotificationEvent,
  logSent,
  logDelivered,
  logRead,
  logAcknowledged,
  logFailed,
  logEscalated,
};

