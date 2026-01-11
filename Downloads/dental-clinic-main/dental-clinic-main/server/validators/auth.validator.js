/**
 * Authentication Validation Rules
 * Using express-validator for input validation
 */

const { body } = require("express-validator");

/**
 * Validation rules for login
 */
const validateLogin = [
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .customSanitizer((value) => {
      // Normalize phone number: remove spaces, convert +251 to 0, ensure starts with 0
      let normalized = value.replace(/\s+/g, "").replace(/^\+251/, "0");
      
      // If doesn't start with 0, add it (for numbers like 912345678)
      if (!normalized.startsWith("0")) {
        normalized = `0${normalized}`;
      }
      
      return normalized;
    })
    .custom((value) => {
      // Validate Ethiopian mobile phone format: 09XXXXXXXX (10 digits starting with 0, second digit 9, followed by 8 digits)
      // Pattern: ^0[9]\d{8}$ enforces Ethiopian mobile format (second digit must be 9)
      if (!/^0[9]\d{8}$/.test(value)) {
        throw new Error("Invalid phone number format. Must be 10 digits starting with 0, second digit 9 (e.g., 0911922363)");
      }
      return true;
    }),
  body("password")
    .trim()
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
];

module.exports = {
  validateLogin,
};
