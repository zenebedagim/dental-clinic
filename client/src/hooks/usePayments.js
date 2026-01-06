import { useState, useEffect, useCallback, useRef } from "react";
import api from "../services/api";
import useBranch from "./useBranch";
import requestCache from "../utils/requestCache";

/**
 * Shared hook for fetching payments
 * Provides consistent data fetching pattern across components
 */
const usePayments = (options = {}) => {
  const { selectedBranch } = useBranch();
  const {
    autoFetch = true,
    initialParams = {},
    cacheTTL = 60000, // 60 seconds
  } = options;

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const abortControllerRef = useRef(null);

  const fetchPayments = useCallback(
    async (params = {}, skipCache = false) => {
      if (!selectedBranch?.id) {
        setPayments([]);
        return;
      }

      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const cacheKey = requestCache.generateKey("/payments", {
        branchId: selectedBranch.id,
        ...initialParams,
        ...params,
      });

      // Check cache first
      if (!skipCache) {
        const cached = requestCache.get(cacheKey);
        if (cached) {
          setPayments(cached);
          setLoading(false);
          return;
        }
      }

      try {
        setLoading(true);
        setError(null);

        const response = await api.get("/payments", {
          params: {
            branchId: selectedBranch.id,
            ...initialParams,
            ...params,
          },
          signal: abortController.signal,
        });

        const data = response.data?.data || response.data || [];
        setPayments(data);

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
          err.response?.data?.message || "Failed to load payments";
        setError(errorMsg);
        console.error("Error fetching payments:", err);
      } finally {
        setLoading(false);
      }
    },
    [selectedBranch, initialParams, cacheTTL]
  );

  const refreshPayments = useCallback(
    (params = {}) => {
      const cacheKey = requestCache.generateKey("/payments", {
        branchId: selectedBranch?.id,
        ...initialParams,
        ...params,
      });
      requestCache.delete(cacheKey);
      fetchPayments(params, true);
    },
    [fetchPayments, selectedBranch, initialParams]
  );

  // Auto-fetch on mount and when branch changes
  useEffect(() => {
    if (autoFetch && selectedBranch?.id) {
      fetchPayments();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoFetch, selectedBranch?.id, fetchPayments]);

  return {
    payments,
    loading,
    error,
    fetchPayments,
    refreshPayments,
  };
};

export default usePayments;
