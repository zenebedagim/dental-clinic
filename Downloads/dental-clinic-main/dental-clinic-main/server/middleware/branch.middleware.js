/**
 * Branch Validation Middleware
 * Validates branchId parameter and ensures branch exists
 */

const prisma = require("../config/db");
const { sendError } = require("../utils/response.util");

/**
 * Validate branchId from query parameter
 * Optionally checks if branch is active
 */
const validateBranchId = (options = {}) => {
  const { checkActive = true, requireActive = true } = options;

  return async (req, res, next) => {
    try {
      const branchId = req.query.branchId || req.params.branchId || req.body.branchId;

      if (!branchId) {
        return sendError(res, "Branch ID is required", 400);
      }

      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
      });

      if (!branch) {
        return sendError(res, "Branch not found", 404);
      }

      if (checkActive && requireActive && !branch.isActive) {
        return sendError(res, "Branch is archived and cannot be used", 400);
      }

      // Attach branch to request object for use in controllers
      req.branch = branch;

      next();
    } catch (error) {
      console.error("Branch validation error:", error);
      return sendError(res, "Failed to validate branch", 500, error);
    }
  };
};

/**
 * Validate branchId from request body (for POST/PUT requests)
 */
const validateBranchIdFromBody = (options = {}) => {
  return validateBranchId({ ...options, source: "body" });
};

/**
 * Validate branchId from query parameters (for GET requests)
 */
const validateBranchIdFromQuery = (options = {}) => {
  return validateBranchId({ ...options, source: "query" });
};

/**
 * Validate branchId from URL parameters (for routes like /:branchId)
 */
const validateBranchIdFromParams = (options = {}) => {
  return validateBranchId({ ...options, source: "params" });
};

module.exports = {
  validateBranchId,
  validateBranchIdFromBody,
  validateBranchIdFromQuery,
  validateBranchIdFromParams,
};

