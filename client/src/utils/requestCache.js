/**
 * Simple in-memory cache with TTL (Time To Live) for API responses
 * Helps reduce API calls and improve performance on slow networks
 */

class RequestCache {
  constructor(maxSize = 100, defaultTTL = 60000) {
    // Default TTL: 60 seconds (1 minute)
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Generate cache key from parameters
   * @param {string} baseKey - Base key (e.g., endpoint path)
   * @param {object} params - Query parameters or other key parts
   * @returns {string} Cache key
   */
  generateKey(baseKey, params = {}) {
    const paramsString = Object.keys(params)
      .sort()
      .map((key) => `${key}=${JSON.stringify(params[key])}`)
      .join("&");
    return paramsString ? `${baseKey}?${paramsString}` : baseKey;
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if not found/expired
   */
  get(key) {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Set cached value
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional, uses default if not provided)
   */
  set(key, value, ttl = null) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Delete cached value
   * @param {string} key - Cache key (supports partial matching with function)
   */
  delete(key) {
    if (typeof key === "function") {
      // Delete all keys that match the predicate
      for (const cacheKey of this.cache.keys()) {
        if (key(cacheKey)) {
          this.cache.delete(cacheKey);
        }
      }
    } else {
      this.cache.delete(key);
    }
  }

  /**
   * Clear all cached values
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  clearExpired() {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics (for monitoring)
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}

// Singleton instance
const requestCache = new RequestCache(100, 60000); // Max 100 entries, default 60s TTL

export default requestCache;

