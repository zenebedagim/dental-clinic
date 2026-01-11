const auditService = require("../services/audit.service");

/**
 * Middleware to log login attempts
 * Should be used in auth controller login endpoint
 */
const logLoginAttempt = async (req, res, next) => {
  // This will be called after successful login in the auth controller
  // We'll pass the user ID through req.user which is set by auth middleware
  next();
};

/**
 * Helper function to log login (called from auth controller after successful login)
 */
const logLogin = async (userId, req, success = true) => {
  await auditService.logAction(
    userId,
    success ? "LOGIN" : "LOGIN_FAILED",
    "User",
    userId,
    null,
    { success },
    req,
    null
  );
};

/**
 * Helper function to log logout (called from auth controller)
 */
const logLogout = async (userId, req) => {
  await auditService.logAction(
    userId,
    "LOGOUT",
    "User",
    userId,
    null,
    null,
    req,
    null
  );
};

module.exports = {
  logLoginAttempt,
  logLogin,
  logLogout,
};

