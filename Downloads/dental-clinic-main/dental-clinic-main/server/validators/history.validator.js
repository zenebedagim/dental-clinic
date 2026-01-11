/**
 * History Validation Rules
 * Using express-validator for input validation
 */

const { query } = require("express-validator");

/**
 * Validation rules for searching patient history
 */
const validatePatientHistorySearch = [
  query("name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Patient name must be between 1 and 100 characters"),
  query("branchId").optional().isUUID().withMessage("Invalid branch ID format"),
];

module.exports = {
  validatePatientHistorySearch,
};

