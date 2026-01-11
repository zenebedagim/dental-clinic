/**
 * Centralized Error Handling Middleware
 * Handles all errors and provides consistent error responses
 */

const { sendError } = require("../utils/response.util");

/**
 * Error handling middleware
 * Must be placed after all routes in server.js
 */
const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // Handle Prisma errors
  if (err.code === "P2002") {
    // Unique constraint violation
    return sendError(
      res,
      "A record with this information already exists",
      409,
      err
    );
  }

  if (err.code === "P2025") {
    // Record not found
    return sendError(res, "Record not found", 404, err);
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return sendError(res, "Invalid token", 401, err);
  }

  if (err.name === "TokenExpiredError") {
    return sendError(res, "Token expired", 401, err);
  }

  // Handle CORS errors
  if (err.message === "Not allowed by CORS") {
    return sendError(
      res,
      "CORS: Request not allowed from this origin",
      403,
      err
    );
  }

  // Handle validation errors
  if (err.name === "ValidationError") {
    return sendError(res, err.message || "Validation error", 400, err);
  }

  // Handle custom application errors
  if (err.statusCode) {
    return sendError(
      res,
      err.message || "An error occurred",
      err.statusCode,
      err
    );
  }

  // Default error response
  return sendError(
    res,
    err.message || "Internal server error",
    500,
    process.env.NODE_ENV === "development" ? err : null
  );
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res) => {
  return sendError(res, `Route ${req.originalUrl} not found`, 404);
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
