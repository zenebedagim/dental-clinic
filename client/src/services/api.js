import axios from "axios";

// Ensure base URL always ends with /api
const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API_URL = baseURL.endsWith("/api") ? baseURL : `${baseURL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

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
  (error) => {
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
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
