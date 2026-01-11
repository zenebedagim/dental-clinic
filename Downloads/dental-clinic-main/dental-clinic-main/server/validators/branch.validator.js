/**
 * Branch Validation Rules
 * Using express-validator for input validation
 */

const { body, param, query } = require("express-validator");

/**
 * Validation rules for creating a branch
 */
const validateCreateBranch = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Branch name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Branch name must be between 2 and 100 characters"),
  body("code")
    .trim()
    .notEmpty()
    .withMessage("Branch code is required")
    .isLength({ min: 2, max: 20 })
    .withMessage("Branch code must be between 2 and 20 characters")
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage(
      "Branch code can only contain uppercase letters, numbers, hyphens, and underscores"
    ),
  body("address")
    .trim()
    .notEmpty()
    .withMessage("Address is required")
    .isLength({ min: 5, max: 255 })
    .withMessage("Address must be between 5 and 255 characters"),
  body("taxNumber")
    .trim()
    .notEmpty()
    .withMessage("Tax number is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Tax number must be between 3 and 50 characters"),
];

/**
 * Validation rules for updating a branch
 */
const validateUpdateBranch = [
  param("id").isUUID().withMessage("Invalid branch ID format"),
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Branch name cannot be empty")
    .isLength({ min: 2, max: 100 })
    .withMessage("Branch name must be between 2 and 100 characters"),
  body("code")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Branch code cannot be empty")
    .isLength({ min: 2, max: 20 })
    .withMessage("Branch code must be between 2 and 20 characters")
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage(
      "Branch code can only contain uppercase letters, numbers, hyphens, and underscores"
    ),
  body("address")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Address cannot be empty")
    .isLength({ min: 5, max: 255 })
    .withMessage("Address must be between 5 and 255 characters"),
  body("taxNumber")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Tax number cannot be empty")
    .isLength({ min: 3, max: 50 })
    .withMessage("Tax number must be between 3 and 50 characters"),
];

/**
 * Validation rules for branch ID parameter
 */
const validateBranchId = [
  param("id").isUUID().withMessage("Invalid branch ID format"),
];

/**
 * Validation rules for branch search query
 */
const validateBranchSearch = [
  query("q")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters"),
];

module.exports = {
  validateCreateBranch,
  validateUpdateBranch,
  validateBranchId,
  validateBranchSearch,
};
