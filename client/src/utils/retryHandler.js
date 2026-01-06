/**
 * Retry handler utility with exponential backoff
 * Handles retrying failed requests with configurable options
 */

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry (should return a Promise)
 * @param {object} options - Retry options
 * @returns {Promise} Promise that resolves/rejects after retries
 */
export const retryWithBackoff = async (fn, options = {}) => {
  const {
    maxRetries = 3,
    initialDelay = 1000, // 1 second
    maxDelay = 10000, // 10 seconds
    backoffFactor = 2,
    retryableErrors = [408, 429, 500, 502, 503, 504], // HTTP status codes to retry
    onRetry = null, // Callback function called on each retry
  } = options;

  let lastError;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if it's the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Check if error is retryable
      const statusCode = error.response?.status;
      const isRetryable = !statusCode || retryableErrors.includes(statusCode);

      if (!isRetryable) {
        // Don't retry for non-retryable errors
        throw error;
      }

      // Call onRetry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error, delay);
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Calculate next delay with exponential backoff
      delay = Math.min(delay * backoffFactor, maxDelay);
    }
  }

  // All retries exhausted, throw last error
  throw lastError;
};

/**
 * Check if an error is retryable
 * @param {Error} error - Error to check
 * @param {number[]} retryableStatusCodes - HTTP status codes to retry
 * @returns {boolean} True if error is retryable
 */
export const isRetryableError = (
  error,
  retryableStatusCodes = [408, 429, 500, 502, 503, 504]
) => {
  // Don't retry canceled requests (intentional cancellation via AbortController)
  if (error.code === "ERR_CANCELED" || error.message === "canceled") {
    return false;
  }

  // Network errors (no response) are retryable, but not if canceled
  if (!error.response) {
    // Check if it's a cancellation error
    if (error.code === "ERR_CANCELED" || error.message?.toLowerCase().includes("cancel")) {
      return false;
    }
    return true;
  }

  // Check if status code is retryable
  const statusCode = error.response.status;
  return retryableStatusCodes.includes(statusCode);
};

export default {
  retryWithBackoff,
  isRetryableError,
};
