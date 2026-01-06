/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting the number of requests per IP address
 */

const rateLimitStore = new Map();

/**
 * Clear rate limit for a specific IP (useful after successful login)
 * @param {string} ip - IP address to clear rate limit for
 */
const clearRateLimit = (ip) => {
  rateLimitStore.delete(ip);
};

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis or a dedicated rate limiting library
 * @param {Object} options - Rate limiting options
 * @param {number} options.windowMs - Time window in milliseconds (default: 15 minutes)
 * @param {number} options.maxRequests - Maximum requests per window (default: 100)
 * @returns {Function} Express middleware function
 */
const rateLimiter = (options = {}) => {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
  const maxRequests = options.maxRequests || 100;

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const now = Date.now();

    // Always clean up expired entries (more reliable than random cleanup)
      for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetTime) {
          rateLimitStore.delete(key);
      }
    }

    // Get or create rate limit entry for this IP
    let rateLimit = rateLimitStore.get(ip);

    // Check if existing entry is expired
    if (rateLimit && now > rateLimit.resetTime) {
      // Entry expired, delete it and create new one
      rateLimitStore.delete(ip);
      rateLimit = null;
    }

    if (!rateLimit) {
      // Create new rate limit entry
      rateLimit = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(ip, rateLimit);
    }

    // Increment request count
    rateLimit.count++;

    // Check if limit exceeded
    if (rateLimit.count > maxRequests) {
      const retryAfter = Math.ceil((rateLimit.resetTime - now) / 1000);
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
        retryAfter,
      });
    }

    // Add rate limit headers
    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, maxRequests - rateLimit.count)
    );
    res.setHeader(
      "X-RateLimit-Reset",
      new Date(rateLimit.resetTime).toISOString()
    );

    next();
  };
};

/**
 * Rate limiter for authentication endpoints
 * Very lenient to allow for typos, development testing, and rapid login attempts
 */
const authRateLimiter = rateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute (shorter window for faster reset)
  maxRequests: 100, // 100 login attempts per minute (very lenient for development)
});

/**
 * Rate limiter for API endpoints
 */
const apiRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests per 15 minutes
});

/**
 * Rate limiter for search endpoints (very lenient for real-time search)
 * Increased limits to handle rapid typing with debouncing
 */
const searchRateLimiter = rateLimiter({
  windowMs: 15 * 1000, // 15 seconds (longer window)
  maxRequests: 100, // 100 searches per 15 seconds (allows rapid typing with 600ms debounce)
});

module.exports = {
  rateLimiter,
  authRateLimiter,
  apiRateLimiter,
  searchRateLimiter,
  clearRateLimit,
};
