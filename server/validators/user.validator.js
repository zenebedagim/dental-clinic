/**
 * User Validation Rules
 * Using express-validator for input validation
 */

const { body, param, query } = require("express-validator");

/**
 * Validation rules for creating a user
 */
const validateCreateUser = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("role")
    .isIn(["RECEPTION", "DENTIST", "XRAY"])
    .withMessage("Invalid role. Must be RECEPTION, DENTIST, or XRAY"),
  body("branchId").isUUID().withMessage("Invalid branch ID format"),
];

/**
 * Validation rules for updating a user
 */
const validateUpdateUser = [
  param("id").isUUID().withMessage("Invalid user ID format"),
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),
  body("email")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Email cannot be empty")
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
  body("password")
    .optional()
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("role")
    .optional()
    .isIn(["RECEPTION", "DENTIST", "XRAY"])
    .withMessage("Invalid role. Must be RECEPTION, DENTIST, or XRAY"),
  body("branchId").optional().isUUID().withMessage("Invalid branch ID format"),
];

/**
 * Validation rules for user ID parameter
 */
const validateUserId = [
  param("id").isUUID().withMessage("Invalid user ID format"),
];

/**
 * Validation rules for user query parameters
 */
const validateUserQuery = [
  query("branchId").optional().isUUID().withMessage("Invalid branch ID format"),
  query("role")
    .optional()
    .isIn(["RECEPTION", "DENTIST", "XRAY"])
    .withMessage("Invalid role. Must be RECEPTION, DENTIST, or XRAY"),
];

module.exports = {
  validateCreateUser,
  validateUpdateUser,
  validateUserId,
  validateUserQuery,
};
