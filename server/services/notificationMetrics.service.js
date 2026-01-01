/**
 * Notification Metrics Service
 * Tracks delivery times, success rates, active connections, etc.
 */

const prisma = require("../config/db");
const { NotificationLogEvent } = require("./notificationLogger.service");

class NotificationMetrics {
  constructor() {
    this.metrics = {
      totalSent: 0,
      totalDelivered: 0,
      totalRead: 0,
      totalAcknowledged: 0,
      totalFailed: 0,
      totalEscalated: 0,
      activeConnections: 0,
      averageDeliveryTime: 0,
      deliveryTimes: [],
    };
  }

  /**
   * Increment metric counter
   */
  increment(metric) {
    if (this.metrics[metric] !== undefined) {
      this.metrics[metric]++;
    }
  }

  /**
   * Decrement metric counter
   */
  decrement(metric) {
    if (this.metrics[metric] !== undefined && this.metrics[metric] > 0) {
      this.metrics[metric]--;
    }
  }

  /**
   * Record delivery time
   */
  recordDeliveryTime(timeMs) {
    this.metrics.deliveryTimes.push(timeMs);
    // Keep only last 1000 delivery times
    if (this.metrics.deliveryTimes.length > 1000) {
      this.metrics.deliveryTimes.shift();
    }
    // Calculate average
    const sum = this.metrics.deliveryTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageDeliveryTime = sum / this.metrics.deliveryTimes.length;
  }

  /**
   * Set active connections count
   */
  setActiveConnections(count) {
    this.metrics.activeConnections = count;
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate:
        this.metrics.totalSent > 0
          ? (this.metrics.totalDelivered / this.metrics.totalSent) * 100
          : 0,
      readRate:
        this.metrics.totalDelivered > 0
          ? (this.metrics.totalRead / this.metrics.totalDelivered) * 100
          : 0,
      ackRate:
        this.metrics.totalDelivered > 0
          ? (this.metrics.totalAcknowledged / this.metrics.totalDelivered) * 100
          : 0,
      failureRate:
        this.metrics.totalSent > 0
          ? (this.metrics.totalFailed / this.metrics.totalSent) * 100
          : 0,
    };
  }

  /**
   * Get metrics from database (last 24 hours)
   */
  async getDatabaseMetrics() {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const [sent, delivered, read, acknowledged, failed, escalated] =
        await Promise.all([
          prisma.notificationLog.count({
            where: {
              event: NotificationLogEvent.SENT,
              timestamp: { gte: twentyFourHoursAgo },
            },
          }),
          prisma.notificationLog.count({
            where: {
              event: NotificationLogEvent.DELIVERED,
              timestamp: { gte: twentyFourHoursAgo },
            },
          }),
          prisma.notificationLog.count({
            where: {
              event: NotificationLogEvent.READ,
              timestamp: { gte: twentyFourHoursAgo },
            },
          }),
          prisma.notificationLog.count({
            where: {
              event: NotificationLogEvent.ACKNOWLEDGED,
              timestamp: { gte: twentyFourHoursAgo },
            },
          }),
          prisma.notificationLog.count({
            where: {
              event: NotificationLogEvent.FAILED,
              timestamp: { gte: twentyFourHoursAgo },
            },
          }),
          prisma.notificationLog.count({
            where: {
              event: NotificationLogEvent.ESCALATED,
              timestamp: { gte: twentyFourHoursAgo },
            },
          }),
        ]);

      // Calculate average delivery time
      const deliveryLogs = await prisma.notificationLog.findMany({
        where: {
          event: NotificationLogEvent.DELIVERED,
          timestamp: { gte: twentyFourHoursAgo },
        },
        select: {
          timestamp: true,
          notification: {
            select: {
              createdAt: true,
            },
          },
        },
        take: 100,
      });

      let avgDeliveryTime = 0;
      if (deliveryLogs.length > 0) {
        const times = deliveryLogs
          .filter((log) => log.notification)
          .map((log) => {
            const sentTime = new Date(log.notification.createdAt).getTime();
            const deliveredTime = new Date(log.timestamp).getTime();
            return deliveredTime - sentTime;
          })
          .filter((time) => time > 0);

        if (times.length > 0) {
          avgDeliveryTime = times.reduce((a, b) => a + b, 0) / times.length;
        }
      }

      return {
        last24Hours: {
          sent,
          delivered,
          read,
          acknowledged,
          failed,
          escalated,
          averageDeliveryTime: avgDeliveryTime,
        },
        successRate: sent > 0 ? (delivered / sent) * 100 : 0,
        readRate: delivered > 0 ? (read / delivered) * 100 : 0,
        ackRate: delivered > 0 ? (acknowledged / delivered) * 100 : 0,
        failureRate: sent > 0 ? (failed / sent) * 100 : 0,
      };
    } catch (error) {
      console.error("Error fetching database metrics:", error);
      return null;
    }
  }

  /**
   * Get comprehensive metrics
   */
  async getComprehensiveMetrics() {
    const inMemoryMetrics = this.getMetrics();
    const databaseMetrics = await this.getDatabaseMetrics();

    return {
      inMemory: inMemoryMetrics,
      database: databaseMetrics,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset metrics (for testing)
   */
  reset() {
    this.metrics = {
      totalSent: 0,
      totalDelivered: 0,
      totalRead: 0,
      totalAcknowledged: 0,
      totalFailed: 0,
      totalEscalated: 0,
      activeConnections: 0,
      averageDeliveryTime: 0,
      deliveryTimes: [],
    };
  }
}

// Singleton instance
const metricsService = new NotificationMetrics();

module.exports = metricsService;
