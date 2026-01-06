/**
 * Request deduplication utility
 * Prevents multiple identical requests from being made simultaneously
 */

class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
  }

  /**
   * Generate a unique key for a request
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {object} params - Request parameters
   * @returns {string} Unique request key
   */
  generateKey(method, url, params = {}) {
    const paramsString = Object.keys(params)
      .sort()
      .map((key) => `${key}=${JSON.stringify(params[key])}`)
      .join("&");
    return `${method}:${url}${paramsString ? `?${paramsString}` : ""}`;
  }

  /**
   * Check if a request is already pending
   * @param {string} key - Request key
   * @returns {Promise|null} Pending promise or null
   */
  getPendingRequest(key) {
    return this.pendingRequests.get(key) || null;
  }

  /**
   * Add a pending request
   * @param {string} key - Request key
   * @param {Promise} promise - Request promise
   */
  addPendingRequest(key, promise) {
    this.pendingRequests.set(key, promise);

    // Clean up when promise resolves or rejects
    promise
      .then(() => {
        this.pendingRequests.delete(key);
      })
      .catch(() => {
        this.pendingRequests.delete(key);
      });
  }

  /**
   * Clear all pending requests
   */
  clear() {
    this.pendingRequests.clear();
  }

  /**
   * Clear pending requests for a specific URL pattern
   * @param {string} pattern - URL pattern to match
   */
  clearByPattern(pattern) {
    for (const key of this.pendingRequests.keys()) {
      if (key.includes(pattern)) {
        this.pendingRequests.delete(key);
      }
    }
  }
}

// Singleton instance
const requestDeduplicator = new RequestDeduplicator();

export default requestDeduplicator;
