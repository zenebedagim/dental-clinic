/**
 * Standard API Response Utility
 * Provides consistent response format across all API endpoints
 */

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Optional success message
 */
const sendSuccess = (res, data = null, statusCode = 200, message = null) => {
  const response = {
    success: true,
  };

  if (data !== null) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 400)
 * @param {*} error - Detailed error (only in development)
 */
const sendError = (res, message, statusCode = 400, error = null) => {
  const response = {
    success: false,
    message: message || "An error occurred",
  };

  // Always include error details if provided (for validation errors, etc.)
  if (error) {
    if (typeof error === "string") {
      response.error = error;
    } else if (error.message) {
      response.error = error.message;
    } else if (typeof error === "object") {
      // If error is an object (like validation errors), include it
      Object.assign(response, error);
    } else {
      response.error = String(error);
    }
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  sendSuccess,
  sendError,
};

