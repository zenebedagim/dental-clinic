import { useState, useEffect, useCallback, useRef } from "react";
import api from "../services/api";
import useBranch from "./useBranch";
import requestCache from "../utils/requestCache";

/**
 * Shared hook for fetching appointments
 * Provides consistent data fetching pattern across components
 */
const useAppointments = (options = {}) => {
  const { selectedBranch } = useBranch();
  const {
    autoFetch = true,
    initialParams = {},
    cacheTTL = 60000, // 60 seconds
  } = options;

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const fetchAppointments = useCallback(
    async (params = {}, skipCache = false) => {
      if (!selectedBranch?.id) {
        setAppointments([]);
        return;
      }

      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const cacheKey = requestCache.generateKey("/appointments/reception", {
        branchId: selectedBranch.id,
        ...initialParams,
        ...params,
      });

      // Check cache first
      if (!skipCache) {
        const cached = requestCache.get(cacheKey);
        if (cached) {
          setAppointments(cached);
          setLoading(false);
          return;
        }
      }

      try {
        setLoading(true);
        setError(null);

        const response = await api.get("/appointments/reception", {
          params: {
            branchId: selectedBranch.id,
            ...initialParams,
            ...params,
          },
          signal: abortController.signal,
        });

        const data = response.data?.data || response.data || [];
        setAppointments(data);

        // Cache the result
        requestCache.set(cacheKey, data, cacheTTL);
      } catch (err) {
        // Ignore abort errors
        if (
          err.name === "AbortError" ||
          err.code === "ERR_CANCELED" ||
          err.message?.includes("canceled")
        ) {
          return;
        }

        const errorMsg =
          err.response?.data?.message || "Failed to load appointments";
        setError(errorMsg);
        console.error("Error fetching appointments:", err);
      } finally {
        setLoading(false);
      }
    },
    [selectedBranch, initialParams, cacheTTL]
  );

  const refreshAppointments = useCallback(
    (params = {}) => {
      const cacheKey = requestCache.generateKey("/appointments/reception", {
        branchId: selectedBranch?.id,
        ...initialParams,
        ...params,
      });
      requestCache.delete(cacheKey);
      fetchAppointments(params, true);
    },
    [fetchAppointments, selectedBranch, initialParams]
  );

  // Auto-fetch on mount and when branch changes
  useEffect(() => {
    if (autoFetch && selectedBranch?.id) {
      fetchAppointments();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoFetch, selectedBranch?.id, fetchAppointments]);

  return {
    appointments,
    loading,
    error,
    fetchAppointments,
    refreshAppointments,
  };
};

export default useAppointments;
