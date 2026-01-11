/**
 * Audit Logging Middleware
 * Logs important actions for security and compliance
 */

const prisma = require("../config/db");

/**
 * Create audit log entry
 * @param {Object} req - Express request object
 * @param {string} action - Action performed (e.g., "CREATE_APPOINTMENT", "UPDATE_PAYMENT")
 * @param {Object} details - Additional details about the action
 * @param {string} status - Status of action ("SUCCESS" or "FAILURE")
 */
const createAuditLog = async (
  req,
  action,
  details = {},
  status = "SUCCESS"
) => {
  try {
    const userId = req.user?.id || null;
    const userRole = req.user?.role || "ANONYMOUS";
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const userAgent = req.get("user-agent") || "unknown";

    // Only log to database if Prisma is available
    // For now, we'll just log to console
    // In production, you might want to use a logging service
    console.log("[AUDIT]", {
      timestamp: new Date().toISOString(),
      userId,
      userRole,
      action,
      status,
      ip,
      userAgent,
      details: JSON.stringify(details),
      path: req.path,
      method: req.method,
    });

    // TODO: Store in database if audit log table exists
    // await prisma.auditLog.create({
    //   data: {
    //     userId,
    //     action,
    //     status,
    //     ip,
    //     userAgent,
    //     details: JSON.stringify(details),
    //     path: req.path,
    //     method: req.method,
    //   },
    // });
  } catch (error) {
    console.error("Error creating audit log:", error);
    // Don't throw - audit logging should not break the request
  }
};

/**
 * Audit logging middleware
 * Automatically logs important actions
 */
const auditLogger = (action) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to log after response
    res.json = function (data) {
      const status =
        res.statusCode >= 200 && res.statusCode < 300 ? "SUCCESS" : "FAILURE";
      createAuditLog(req, action, { responseStatus: res.statusCode }, status);
      return originalJson(data);
    };

    next();
  };
};

/**
 * Log sensitive actions (payments, patient data, etc.)
 */
const logSensitiveAction = async (req, action, details = {}) => {
  await createAuditLog(req, action, details, "SUCCESS");
};

module.exports = {
  auditLogger,
  createAuditLog,
  logSensitiveAction,
};
