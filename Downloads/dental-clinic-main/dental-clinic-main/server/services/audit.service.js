const prisma = require("../config/db");

/**
 * Log an action to the audit log
 * @param {string} userId - ID of user who performed the action
 * @param {string} action - Action type (CREATE, UPDATE, DELETE, LOGIN, etc.)
 * @param {string} entityType - Entity type (User, Appointment, Treatment, Payment, etc.)
 * @param {string|null} entityId - ID of affected entity
 * @param {Object|null} oldData - Previous state (for updates/deletes)
 * @param {Object|null} newData - New state (for creates/updates)
 * @param {Object|null} req - Express request object (optional, for IP and user agent)
 * @param {string|null} branchId - Branch context (optional)
 */
const logAction = async (
  userId,
  action,
  entityType,
  entityId = null,
  oldData = null,
  newData = null,
  req = null,
  branchId = null
) => {
  try {
    // Extract IP address and user agent from request
    let ipAddress = null;
    let userAgent = null;

    if (req) {
      ipAddress =
        req.ip ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.headers["x-real-ip"] ||
        null;
      userAgent = req.headers["user-agent"] || null;
    }

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        branchId,
        oldData: oldData ? JSON.parse(JSON.stringify(oldData)) : null,
        newData: newData ? JSON.parse(JSON.stringify(newData)) : null,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    // Don't throw errors - audit logging should not break the main flow
    console.error("Error logging audit action:", error);
  }
};

/**
 * Get audit logs with optional filters
 * @param {Object} filters - Filter options
 * @param {number} limit - Number of logs to return
 * @param {number} offset - Offset for pagination
 */
const getAuditLogs = async (filters = {}, limit = 100, offset = 0) => {
  try {
    const where = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters.entityId) {
      where.entityId = filters.entityId;
    }

    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt.lte = new Date(filters.dateTo);
      }
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.auditLog.count({ where });

    return {
      logs,
      total,
      limit,
      offset,
    };
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    throw error;
  }
};

/**
 * Get audit logs for a specific user
 */
const getUserAuditLogs = async (userId, limit = 100, offset = 0) => {
  return getAuditLogs({ userId }, limit, offset);
};

/**
 * Get audit logs for a specific entity
 */
const getEntityAuditLogs = async (
  entityType,
  entityId,
  limit = 100,
  offset = 0
) => {
  return getAuditLogs({ entityType, entityId }, limit, offset);
};

module.exports = {
  logAction,
  getAuditLogs,
  getUserAuditLogs,
  getEntityAuditLogs,
};
