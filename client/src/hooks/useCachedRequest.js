import { useState, useEffect, useRef, useCallback } from "react";
import api from "../services/api";
import requestCache from "../utils/requestCache";

/**
 * Hook for cached API requests with automatic cache invalidation and request deduplication
 * @param {string} endpoint - API endpoint
 * @param {object} options - Request options
 * @param {object} options.params - Query parameters
 * @param {number} options.ttl - Cache TTL in milliseconds
 * @param {boolean} options.enabled - Whether to make the request (default: true)
 * @param {function} options.onSuccess - Callback on successful request
 * @param {function} options.onError - Callback on error
 * @returns {object} { data, loading, error, refetch }
 */
export const useCachedRequest = (endpoint, options = {}) => {
  const {
    params = {},
    ttl = 60000, // Default 60 seconds
    enabled = true,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);
  const requestPromiseRef = useRef(null);

  // Generate cache key
  const cacheKey = requestCache.generateKey(endpoint, params);

  const fetchData = useCallback(
    async (skipCache = false) => {
      // Check cache first (unless skipCache is true)
      if (!skipCache) {
        const cached = requestCache.get(cacheKey);
        if (cached !== null) {
          setData(cached);
          setError(null);
          return;
        }
      }

      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      // Check if there's already a pending request for this endpoint
      if (requestPromiseRef.current) {
        try {
          const result = await requestPromiseRef.current;
          setData(result);
          setError(null);
          if (onSuccess) onSuccess(result);
          return;
        } catch {
          // If the previous request failed, continue with new request
        }
      }

      setLoading(true);
      setError(null);

      try {
        // Create request promise
        const requestPromise = api.get(endpoint, {
          params,
          signal: abortControllerRef.current.signal,
        });

        requestPromiseRef.current = requestPromise;

        const response = await requestPromise;
        const responseData = response.data?.data ?? response.data ?? response;

        // Cache the response
        requestCache.set(cacheKey, responseData, ttl);

        setData(responseData);
        setError(null);
        if (onSuccess) onSuccess(responseData);
      } catch (err) {
        // Ignore abort errors
        if (err.name === "AbortError" || err.code === "ERR_CANCELED") {
          return;
        }

        setError(err);
        if (onError) onError(err);
      } finally {
        setLoading(false);
        requestPromiseRef.current = null;
        abortControllerRef.current = null;
      }
    },
    [endpoint, cacheKey, ttl, params, onSuccess, onError]
  );

  const refetch = useCallback(() => {
    return fetchData(true); // Skip cache on refetch
  }, [fetchData]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    fetchData();

    // Cleanup: cancel request on unmount or dependency change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled, fetchData]);

  return { data, loading, error, refetch };
};

/**
 * Hook to invalidate cache entries
 * @param {string|function} keyPattern - Cache key pattern or function to match keys
 */
export const useCacheInvalidation = () => {
  const invalidate = useCallback((keyPattern) => {
    requestCache.delete(keyPattern);
  }, []);

  const invalidateByPrefix = useCallback((prefix) => {
    requestCache.delete((key) => key.startsWith(prefix));
  }, []);

  const clearAll = useCallback(() => {
    requestCache.clear();
  }, []);

  return { invalidate, invalidateByPrefix, clearAll };
};
