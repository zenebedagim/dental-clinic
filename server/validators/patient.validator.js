/**
 * Patient Validation Rules
 * Using express-validator for input validation
 */

const { body, param, query } = require("express-validator");

/**
 * Validation rules for creating a patient
 */
const validateCreatePatient = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Patient name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Patient name must be between 2 and 100 characters"),
  body("phone")
    .optional()
    .trim()
    .matches(
      /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/
    )
    .withMessage("Invalid phone number format"),
  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format. Use ISO 8601 format (YYYY-MM-DD)")
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      if (birthDate > today) {
        throw new Error("Date of birth cannot be in the future");
      }
      return true;
    }),
  body("address")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address must be less than 500 characters"),
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes must be less than 1000 characters"),
];

/**
 * Validation rules for updating a patient
 */
const validateUpdatePatient = [
  param("id").isUUID().withMessage("Invalid patient ID format"),
  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Patient name cannot be empty")
    .isLength({ min: 2, max: 100 })
    .withMessage("Patient name must be between 2 and 100 characters"),
  body("phone")
    .optional()
    .trim()
    .matches(
      /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/
    )
    .withMessage("Invalid phone number format"),
  body("email")
    .optional()
    .trim()
    .isEmail()
    .withMessage("Invalid email format")
    .normalizeEmail(),
  body("gender")
    .optional()
    .isIn(["Male", "Female", "Other"])
    .withMessage("Gender must be Male, Female, or Other"),
  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format. Use ISO 8601 format (YYYY-MM-DD)")
    .custom((value) => {
      if (value) {
        const birthDate = new Date(value);
        const today = new Date();
        if (birthDate > today) {
          throw new Error("Date of birth cannot be in the future");
        }
      }
      return true;
    }),
  body("address")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address must be less than 500 characters"),
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Notes must be less than 1000 characters"),
];

/**
 * Validation rules for patient ID parameter
 */
const validatePatientId = [
  param("id").isUUID().withMessage("Invalid patient ID format"),
];

/**
 * Validation rules for patient search query
 * Simplified - only validate when values are actually provided
 */
const validatePatientSearch = [
  // All query parameters are optional - no strict validation
  // The controller will handle parsing and validation
  query("name").optional(),
  query("phone").optional(),
  query("cardNo").optional(),
  query("email").optional(),
  query("dateOfBirth_from").optional(),
  query("dateOfBirth_to").optional(),
  query("createdAt_from").optional(),
  query("createdAt_to").optional(),
  query("limit").optional(),
  query("offset").optional(),
  query("branchId").optional(),
];

module.exports = {
  validateCreatePatient,
  validateUpdatePatient,
  validatePatientId,
  validatePatientSearch,
};
