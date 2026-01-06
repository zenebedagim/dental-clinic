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
 * @param {Object} meta - Optional metadata (pagination, etc.)
 */
const sendSuccess = (
  res,
  data = null,
  statusCode = 200,
  message = null,
  meta = null
) => {
  const response = {
    success: true,
  };

  if (data !== null) {
    response.data = data;
  }

  if (message) {
    response.message = message;
  }

  if (meta) {
    response.meta = meta;
  }

  // Add ETag and Last-Modified headers for caching if data is provided
  if (data && Array.isArray(data) && data.length > 0) {
    const etag = generateETag(data);
    res.set("ETag", etag);
    res.set("Last-Modified", new Date().toUTCString());
  }

  return res.status(statusCode).json(response);
};

/**
 * Generate ETag for data
 * @param {*} data - Data to generate ETag for
 * @returns {string} ETag value
 */
const generateETag = (data) => {
  const dataString = JSON.stringify(data);
  // Simple hash function (in production, use crypto)
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `"${Math.abs(hash).toString(16)}"`;
};

/**
 * Send paginated success response
 * @param {Object} res - Express response object
 * @param {Array} data - Response data array
 * @param {Object} pagination - Pagination info { total, page, pageSize }
 * @param {number} statusCode - HTTP status code (default: 200)
 * @param {string} message - Optional success message
 */
const sendPaginatedSuccess = (
  res,
  data = [],
  pagination = {},
  statusCode = 200,
  message = null
) => {
  const { total = 0, page = 1, pageSize = 20 } = pagination;
  const hasMore = page * pageSize < total;

  const meta = {
    pagination: {
      total,
      page,
      pageSize,
      hasMore,
      totalPages: Math.ceil(total / pageSize),
    },
  };

  return sendSuccess(res, data, statusCode, message, meta);
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
  sendPaginatedSuccess,
};
