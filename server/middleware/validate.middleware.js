/**
 * Validation Middleware Wrapper
 * Handles express-validator validation results
 */

const { validationResult } = require("express-validator");
const { sendError } = require("../utils/response.util");

/**
 * Middleware to check validation results
 * Must be used after express-validator validators
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location,
    }));

    // Always log validation errors for debugging
    console.error("Validation errors:", JSON.stringify(errorMessages, null, 2));
    console.error("Request query:", JSON.stringify(req.query, null, 2));
    console.error("Request URL:", req.originalUrl);

    // Include errors in the response message for better debugging
    const errorDetails = errorMessages.map(e => `${e.field}: ${e.message}`).join(", ");
    return sendError(res, `Validation failed: ${errorDetails}`, 400, {
      errors: errorMessages,
    });
  }

  next();
};

module.exports = validate;

