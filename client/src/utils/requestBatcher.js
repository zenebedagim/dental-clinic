/**
 * Request batching utility
 * Batches multiple API requests into a single request to reduce network overhead
 */

class RequestBatcher {
  constructor(batchDelay = 50) {
    this.batchDelay = batchDelay; // Delay in ms before executing batch
    this.pendingRequests = [];
    this.batchTimer = null;
  }

  /**
   * Add a request to the batch queue
   * @param {Function} requestFn - Function that returns a Promise
   * @returns {Promise} Promise that resolves with the request result
   */
  add(requestFn) {
    return new Promise((resolve, reject) => {
      this.pendingRequests.push({ requestFn, resolve, reject });

      // Clear existing timer
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
      }

      // Set new timer to execute batch
      this.batchTimer = setTimeout(() => {
        this.executeBatch();
      }, this.batchDelay);
    });
  }

  /**
   * Execute all pending requests in parallel
   */
  async executeBatch() {
    if (this.pendingRequests.length === 0) return;

    const requests = [...this.pendingRequests];
    this.pendingRequests = [];
    this.batchTimer = null;

    // Execute all requests in parallel
    const promises = requests.map(({ requestFn }) => requestFn());

    try {
      const results = await Promise.allSettled(promises);

      // Resolve or reject each promise based on result
      results.forEach((result, index) => {
        const { resolve, reject } = requests[index];
        if (result.status === "fulfilled") {
          resolve(result.value);
        } else {
          reject(result.reason);
        }
      });
    } catch (error) {
      // If Promise.allSettled fails (shouldn't happen), reject all
      requests.forEach(({ reject }) => reject(error));
    }
  }

  /**
   * Flush pending requests immediately
   */
  flush() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.executeBatch();
  }

  /**
   * Clear all pending requests
   */
  clear() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.pendingRequests.forEach(({ reject }) =>
      reject(new Error("Batch cleared"))
    );
    this.pendingRequests = [];
  }
}

// Singleton instance for general batching
const requestBatcher = new RequestBatcher(50);

/**
 * Batch API wrapper - batches multiple API calls
 * @param {Array<Function>} requestFns - Array of functions that return Promises
 * @returns {Promise<Array>} Promise that resolves with array of results
 */
export const batchRequests = async (requestFns) => {
  return Promise.all(requestFns.map((fn) => requestBatcher.add(fn)));
};

/**
 * Create a batched API call wrapper
 * @param {Function} apiCall - API call function
 * @returns {Function} Batched version of the API call
 */
export const createBatchedApiCall = (apiCall) => {
  return (...args) => requestBatcher.add(() => apiCall(...args));
};

export default requestBatcher;
