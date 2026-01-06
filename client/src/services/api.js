import axios from "axios";
import requestDeduplicator from "../utils/requestDeduplicator";
import { retryWithBackoff, isRetryableError } from "../utils/retryHandler";

// Ensure base URL always ends with /api
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = baseURL.endsWith("/api") ? baseURL : `${baseURL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds default timeout for slow networks
});

// Request deduplication will be handled at component level via wrapper functions
// Keeping interceptor simple for token injection

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle standard response format and errors
api.interceptors.response.use(
  (response) => {
    // Handle standard response format: { success, data, message }
    if (
      response.data &&
      typeof response.data === "object" &&
      "success" in response.data
    ) {
      // If success is true and data exists, return the data directly
      // This maintains backward compatibility for endpoints that return direct data
      if (response.data.success && response.data.data !== undefined) {
        // For responses with data property, extract it
        // But preserve the original response structure for special cases (like login with token)
        return {
          ...response,
          data:
            response.data.data !== null ? response.data.data : response.data,
          // Also store the full response in a metadata field for components that need it
          _metadata: {
            message: response.data.message,
            originalData: response.data,
          },
        };
      }
    }
    // Return response as-is if it doesn't match standard format
    return response;
  },
  async (error) => {
    // Handle standard error format: { success: false, message, error? }
    if (
      error.response?.data &&
      typeof error.response.data === "object" &&
      "success" in error.response.data
    ) {
      // Extract message from standard error format
      error.response.data._message = error.response.data.message;
    }

    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("selectedBranch");
      // Dispatch custom event to trigger socket disconnection
      window.dispatchEvent(new Event("tokenChanged"));
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // Retry logic for retryable errors (only for GET requests to avoid side effects)
    if (
      error.config &&
      error.config.method?.toLowerCase() === "get" &&
      isRetryableError(error) &&
      !error.config._retry
    ) {
      error.config._retry = true;

      // #region agent log
      const errorInfo = {
        url: error.config.url,
        method: error.config.method,
        status: error.response?.status || "NO_RESPONSE",
        statusText: error.response?.statusText || "Network Error",
        message: error.message,
        code: error.code,
        isNetworkError: !error.response,
        timestamp: Date.now(),
      };
      fetch("http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "api.js:84",
          message: "API request failed - will retry",
          data: errorInfo,
          timestamp: Date.now(),
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "H1",
        }),
      }).catch(() => {});
      // #endregion

      try {
        // Retry with exponential backoff
        return await retryWithBackoff(() => api.request(error.config), {
          maxRetries: 2,
          initialDelay: 1000,
          onRetry: (attempt, err) => {
            console.log(
              `Retrying request (attempt ${attempt}):`,
              error.config.url
            );
            // #region agent log
            fetch("http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                location: "api.js:98",
                message: `Retrying request (attempt ${attempt})`,
                data: {
                  url: error.config.url,
                  attempt,
                  retryErrorStatus: err?.response?.status || "NO_RESPONSE",
                  retryErrorCode: err?.code,
                  retryErrorMessage: err?.message,
                },
                timestamp: Date.now(),
                sessionId: "debug-session",
                runId: "run1",
                hypothesisId: "H1",
              }),
            }).catch(() => {});
            // #endregion
          },
        });
      } catch (retryError) {
        // #region agent log
        fetch("http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "api.js:105",
            message: "All retries failed",
            data: {
              url: error.config.url,
              finalErrorStatus: retryError?.response?.status || "NO_RESPONSE",
              finalErrorCode: retryError?.code,
              finalErrorMessage: retryError?.message,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "H1",
          }),
        }).catch(() => {});
        // #endregion
        // All retries failed, return original error
        return Promise.reject(retryError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
