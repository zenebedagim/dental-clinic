import { createContext, useState, useCallback, useEffect } from "react";
import api from "../services/api";
import useBranch from "../hooks/useBranch";
import requestCache from "../utils/requestCache";

const ReceptionContext = createContext(null);

export const ReceptionProvider = ({ children }) => {
  const { selectedBranch } = useBranch();

  // Appointments state
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  const [appointmentsError, setAppointmentsError] = useState(null);

  // Payments state
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState(null);

  // Patients state (for future use)
  const [patients] = useState([]);
  const [patientsLoading] = useState(false);
  const [patientsError] = useState(null);

  // Cache keys
  const getAppointmentsCacheKey = useCallback(
    (params = {}) => {
      return requestCache.generateKey("/appointments/reception", {
        branchId: selectedBranch?.id,
        ...params,
      });
    },
    [selectedBranch?.id]
  );

  const getPaymentsCacheKey = useCallback(
    (params = {}) => {
      return requestCache.generateKey("/payments", {
        branchId: selectedBranch?.id,
        ...params,
      });
    },
    [selectedBranch?.id]
  );

  // Fetch appointments
  const fetchAppointments = useCallback(
    async (params = {}, skipCache = false) => {
      if (!selectedBranch?.id) {
        setAppointments([]);
        return;
      }

      const cacheKey = getAppointmentsCacheKey(params);

      // Check cache first
      if (!skipCache) {
        const cached = requestCache.get(cacheKey);
        if (cached) {
          setAppointments(cached);
          setAppointmentsLoading(false);
          return;
        }
      }

      try {
        setAppointmentsLoading(true);
        setAppointmentsError(null);

        const response = await api.get("/appointments/reception", {
          params: {
            branchId: selectedBranch.id,
            ...params,
          },
        });

        const data = response.data?.data || response.data || [];
        setAppointments(data);

        // Cache the result
        requestCache.set(cacheKey, data, 60000); // 60 seconds TTL
      } catch (err) {
        const errorMsg =
          err.response?.data?.message || "Failed to load appointments";
        setAppointmentsError(errorMsg);
        console.error("Error fetching appointments:", err);
      } finally {
        setAppointmentsLoading(false);
      }
    },
    [selectedBranch, getAppointmentsCacheKey]
  );

  // Fetch payments
  const fetchPayments = useCallback(
    async (params = {}, skipCache = false) => {
      if (!selectedBranch?.id) {
        setPayments([]);
        return;
      }

      const cacheKey = getPaymentsCacheKey(params);

      // Check cache first
      if (!skipCache) {
        const cached = requestCache.get(cacheKey);
        if (cached) {
          setPayments(cached);
          setPaymentsLoading(false);
          return;
        }
      }

      try {
        setPaymentsLoading(true);
        setPaymentsError(null);

        const response = await api.get("/payments", {
          params: {
            branchId: selectedBranch.id,
            ...params,
          },
        });

        const data = response.data?.data || response.data || [];
        setPayments(data);

        // Cache the result
        requestCache.set(cacheKey, data, 60000); // 60 seconds TTL
      } catch (err) {
        const errorMsg =
          err.response?.data?.message || "Failed to load payments";
        setPaymentsError(errorMsg);
        console.error("Error fetching payments:", err);
      } finally {
        setPaymentsLoading(false);
      }
    },
    [selectedBranch, getPaymentsCacheKey]
  );

  // Refresh appointments (clears cache and refetches)
  const refreshAppointments = useCallback(
    (params = {}) => {
      const cacheKey = getAppointmentsCacheKey(params);
      requestCache.delete(cacheKey);
      fetchAppointments(params, true);
    },
    [fetchAppointments, getAppointmentsCacheKey]
  );

  // Refresh payments (clears cache and refetches)
  const refreshPayments = useCallback(
    (params = {}) => {
      const cacheKey = getPaymentsCacheKey(params);
      requestCache.delete(cacheKey);
      fetchPayments(params, true);
    },
    [fetchPayments, getPaymentsCacheKey]
  );

  // Add appointment to state (optimistic update)
  const addAppointment = useCallback((appointment) => {
    setAppointments((prev) => [appointment, ...prev]);
    // Invalidate cache
    requestCache.delete((key) => key.startsWith("/appointments/reception"));
  }, []);

  // Update appointment in state
  const updateAppointment = useCallback((appointmentId, updates) => {
    setAppointments((prev) =>
      prev.map((apt) =>
        apt.id === appointmentId ? { ...apt, ...updates } : apt
      )
    );
    // Invalidate cache
    requestCache.delete((key) => key.startsWith("/appointments/reception"));
  }, []);

  // Remove appointment from state
  const removeAppointment = useCallback((appointmentId) => {
    setAppointments((prev) => prev.filter((apt) => apt.id !== appointmentId));
    // Invalidate cache
    requestCache.delete((key) => key.startsWith("/appointments/reception"));
  }, []);

  // Add payment to state (optimistic update)
  const addPayment = useCallback((payment) => {
    setPayments((prev) => [payment, ...prev]);
    // Invalidate cache
    requestCache.delete((key) => key.startsWith("/payments"));
  }, []);

  // Update payment in state
  const updatePayment = useCallback((paymentId, updates) => {
    setPayments((prev) =>
      prev.map((payment) =>
        payment.id === paymentId ? { ...payment, ...updates } : payment
      )
    );
    // Invalidate cache
    requestCache.delete((key) => key.startsWith("/payments"));
  }, []);

  // Clear all cache when branch changes
  useEffect(() => {
    if (selectedBranch?.id) {
      // Clear all reception-related cache when branch changes
      requestCache.delete(
        (key) =>
          key.startsWith("/appointments/reception") ||
          key.startsWith("/payments")
      );
    }
  }, [selectedBranch?.id]);

  const value = {
    // Appointments
    appointments,
    appointmentsLoading,
    appointmentsError,
    fetchAppointments,
    refreshAppointments,
    addAppointment,
    updateAppointment,
    removeAppointment,

    // Payments
    payments,
    paymentsLoading,
    paymentsError,
    fetchPayments,
    refreshPayments,
    addPayment,
    updatePayment,

    // Patients (can be extended later)
    patients,
    patientsLoading,
    patientsError,
  };

  return (
    <ReceptionContext.Provider value={value}>
      {children}
    </ReceptionContext.Provider>
  );
};

export default ReceptionContext;
