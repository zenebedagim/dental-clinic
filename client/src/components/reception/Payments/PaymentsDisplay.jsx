import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import usePatient from "../../../hooks/usePatient";
import DataTable from "../../common/DataTable";
import PaymentModal from "./PaymentModal";
import { formatDate } from "../Shared/DateFormatter";
import {
  formatCurrency,
  toNumber,
  formatPaymentStatus,
} from "../Shared/PaymentFormatter";
import requestCache from "../../../utils/requestCache";

const PaymentsDisplay = () => {
  const { selectedBranch } = useBranch();
  const { setSelectedPatient } = usePatient();
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [patientFilter, setPatientFilter] = useState("");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedPatientPayments, setSelectedPatientPayments] = useState([]);
  const [selectedPatientAppointments, setSelectedPatientAppointments] =
    useState([]);

  const abortControllerRef = useRef(null);

  const fetchPayments = useCallback(
    async (skipCache = false) => {
      if (!selectedBranch?.id) {
        return;
      }

      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Use AbortController for request cancellation
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Generate cache key
      const cacheKey = requestCache.generateKey("/payments", {
        branchId: selectedBranch.id,
        limit: 50, // Request backend to limit results
      });

      try {
        setLoading(true);

        // Check cache first (unless skipCache is true)
        if (!skipCache) {
          const cached = requestCache.get(cacheKey);
          if (cached !== null) {
            setPayments(cached);
            setError("");
            setLoading(false);
            return;
          }
        }

        // Request backend to filter and limit data for better performance
        const response = await api.get("/payments", {
          params: {
            branchId: selectedBranch.id,
            isHidden: "false", // Only visible payments
            limit: 50, // Limit results on backend
          },
          signal: abortController.signal,
        });
        const paymentsData = response.data?.data || response.data || [];

        // Handle case where no payments exist yet (empty array is fine)
        if (!Array.isArray(paymentsData)) {
          setPayments([]);
          requestCache.set(cacheKey, [], 120000); // Cache empty result (TTL: 2 minutes)
          return;
        }

        // Map payment data to display format (backend already filters by branch and limits)
        const formattedPayments = paymentsData
          .map((payment) => ({
            id: payment.id,
            appointmentId: payment.appointmentId,
            patientName: payment.appointment?.patientName || "N/A",
            patient: payment.appointment?.patient,
            date: payment.appointment?.date || payment.paymentDate,
            dentist: payment.appointment?.dentist?.name || "N/A",
            treatment: payment.appointment?.treatment,
            amount: toNumber(payment.amount),
            paidAmount: toNumber(payment.paidAmount),
            paymentStatus: payment.paymentStatus,
            paymentMethod: payment.paymentMethod,
            paymentDate: payment.paymentDate,
            isHidden: payment.isHidden || false,
            notes: payment.notes || "", // Include payment notes from dentist
            appointment: payment.appointment,
            payment: payment,
          }))
          .sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date (most recent first)

        // Cache the formatted payments (TTL: 2 minutes)
        requestCache.set(cacheKey, formattedPayments, 120000);
        setPayments(formattedPayments);
      } catch (err) {
        // Ignore abort errors
        if (err.name === "AbortError" || err.code === "ERR_CANCELED") return;

        // Handle 404 gracefully - just means no payments exist yet
        if (err.response?.status === 404) {
          setPayments([]);
          setError(""); // Clear error, empty state is fine
          requestCache.set(cacheKey, [], 120000); // Cache empty result
        } else {
          setError(err.response?.data?.message || "Failed to fetch payments");
        }
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [selectedBranch]
  );

  useEffect(() => {
    if (selectedBranch?.id) {
      fetchPayments();
    }
  }, [selectedBranch, fetchPayments]);

  // Listen for appointment and payment creation events to refresh payments list
  useEffect(() => {
    const handleAppointmentCreated = () => {
      if (selectedBranch?.id) {
        fetchPayments(true); // Skip cache when refreshing
      }
    };

    const handlePaymentCreated = () => {
      if (selectedBranch?.id) {
        // Invalidate cache and refresh payments
        const cacheKey = requestCache.generateKey("/payments", {
          branchId: selectedBranch.id,
          limit: 50,
        });
        requestCache.delete(cacheKey);
        fetchPayments(true); // Skip cache when refreshing
      }
    };

    window.addEventListener("appointment-created", handleAppointmentCreated);
    window.addEventListener("payment-created", handlePaymentCreated);
    return () => {
      window.removeEventListener(
        "appointment-created",
        handleAppointmentCreated
      );
      window.removeEventListener("payment-created", handlePaymentCreated);
    };
  }, [selectedBranch, fetchPayments]);

  // Group payments by patient and filter
  const groupedByPatient = useMemo(() => {
    let filtered = payments;

    // Filter out hidden payments
    filtered = filtered.filter((payment) => !payment.isHidden);

    // Filter by payment status
    if (statusFilter !== "ALL") {
      filtered = filtered.filter(
        (payment) => payment.paymentStatus === statusFilter
      );
    }

    // Filter by patient name
    if (patientFilter) {
      filtered = filtered.filter((payment) =>
        payment.patientName?.toLowerCase().includes(patientFilter.toLowerCase())
      );
    }

    // Group by patient (using patient ID if available, otherwise name + phone)
    const patientMap = new Map();

    filtered.forEach((payment) => {
      const patientId =
        payment.patient?.id ||
        `${payment.patientName}_${payment.patient?.phone || ""}`;

      if (!patientMap.has(patientId)) {
        patientMap.set(patientId, {
          patientId: payment.patient?.id,
          patientName: payment.patientName,
          patient: payment.patient,
          phone: payment.patient?.phone || "—",
          dentist: payment.dentist,
          treatment: payment.treatment,
          // Aggregated data
          totalAmount: 0,
          totalPaidAmount: 0,
          paymentCount: 0,
          // Latest payment data (for display)
          latestDate: payment.date,
          latestPaymentStatus: payment.paymentStatus,
          latestNotes: payment.notes,
          // All appointments for this patient (for modal)
          appointments: [],
          // All payments for this patient
          allPayments: [],
        });
      }

      const patientGroup = patientMap.get(patientId);
      patientGroup.totalAmount += payment.amount || 0;
      patientGroup.totalPaidAmount += payment.paidAmount || 0;
      patientGroup.paymentCount += 1;

      // Update latest data if this payment is more recent
      if (new Date(payment.date) > new Date(patientGroup.latestDate)) {
        patientGroup.latestDate = payment.date;
        patientGroup.latestPaymentStatus = payment.paymentStatus;
        patientGroup.latestNotes = payment.notes;
        patientGroup.dentist = payment.dentist;
        patientGroup.treatment = payment.treatment;
      }

      // Store all appointments and payments for this patient
      if (
        payment.appointment &&
        !patientGroup.appointments.find((a) => a.id === payment.appointment.id)
      ) {
        patientGroup.appointments.push(payment.appointment);
      }
      patientGroup.allPayments.push(payment);
    });

    // Convert map to array and format for display
    return Array.from(patientMap.values()).map((group) => ({
      id: `patient_${group.patientId || group.patientName}`,
      patientId: group.patientId,
      patientName: group.patientName,
      patient: group.patient,
      phone: group.phone,
      dentist: group.dentist,
      treatment: group.treatment,
      date: group.latestDate,
      amount: group.totalAmount,
      paidAmount: group.totalPaidAmount,
      paymentStatus: group.latestPaymentStatus,
      notes: group.latestNotes,
      paymentCount: group.paymentCount,
      // Store appointments and payments for action button
      appointments: group.appointments,
      allPayments: group.allPayments,
      // Use latest appointment for modal (will be updated when action is clicked)
      appointment: group.appointments[0] || null,
    }));
  }, [payments, statusFilter, patientFilter]);

  // Keyboard shortcut: Ctrl + H - ONLY way to open private payments
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle if Ctrl+H is pressed (case insensitive)
      if (e.ctrlKey && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        e.stopPropagation();
        // Navigate to private payments - ONLY accessible via Ctrl+H
        navigate("/reception/payments/private");
      }
    };

    // Add listener with capture phase to catch early
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [navigate]);

  // Prepare columns for DataTable
  const columns = [
    {
      key: "date",
      label: "Date & Time",
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: "patientName",
      label: "Patient",
      sortable: true,
      searchable: true,
    },
    {
      key: "patient.phone",
      label: "Phone",
      sortable: true,
      searchable: true,
      render: (value, row) => row.patient?.phone || "—",
    },
    {
      key: "dentist",
      label: "Dentist",
      sortable: true,
      searchable: true,
    },
    {
      key: "treatment",
      label: "Treatment",
      render: (value) =>
        value?.procedures?.length > 0
          ? `${value.procedures.length} procedure(s)`
          : "Treatment completed",
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (value, row) => (
        <div>
          <span className="font-semibold text-green-600">
            {formatCurrency(value)}
          </span>
          {row.paidAmount > 0 && row.paidAmount < value && (
            <p className="text-xs text-gray-500">
              Paid: {formatCurrency(row.paidAmount)}
            </p>
          )}
          {row.paymentCount > 1 && (
            <p className="text-xs text-gray-400">
              ({row.paymentCount} payment{row.paymentCount > 1 ? "s" : ""})
            </p>
          )}
        </div>
      ),
    },
    {
      key: "paymentStatus",
      label: "Payment Status",
      sortable: true,
      render: (value) => {
        const statusConfig = formatPaymentStatus(value || "UNPAID");
        return (
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusConfig.className}`}
          >
            {statusConfig.label}
          </span>
        );
      },
    },
    {
      key: "notes",
      label: "Payment Notes",
      sortable: false,
      searchable: true,
      render: (value) => {
        if (!value || !value.trim()) {
          return <span className="italic text-gray-400">—</span>;
        }
        // Truncate long notes for table display
        const truncated =
          value.length > 50 ? `${value.substring(0, 50)}...` : value;
        return (
          <div className="max-w-xs">
            <p
              className="text-sm text-gray-700 whitespace-pre-wrap"
              title={value}
            >
              {truncated}
            </p>
          </div>
        );
      },
    },
  ];

  if (!selectedBranch) {
    return (
      <div className="px-4 py-3 text-yellow-700 bg-yellow-100 border border-yellow-400 rounded">
        Please select a branch to view payments.
      </div>
    );
  }

  const handleUpdatePayment = async (patientGroup) => {
    // Find the most recent appointment for this patient to use for modal
    const latestAppointment =
      patientGroup.appointments?.sort(
        (a, b) =>
          new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt)
      )[0] || patientGroup.appointment;

    if (!latestAppointment) {
      setError("No appointment found for this patient");
      return;
    }

    // Fetch all payments for all appointments of this patient
    try {
      const allPaymentsForPatient = [];

      // Fetch payments for each appointment of this patient
      for (const apt of patientGroup.appointments || []) {
        try {
          const response = await api.get(`/payments/appointment/${apt.id}`);
          const payments = Array.isArray(response.data?.data)
            ? response.data.data
            : Array.isArray(response.data)
            ? response.data
            : response.data?.data
            ? [response.data.data]
            : [];
          allPaymentsForPatient.push(...payments);
        } catch (err) {
          // Ignore errors for individual appointments
          console.warn(
            `Failed to fetch payments for appointment ${apt.id}:`,
            err
          );
        }
      }

      setSelectedPatientPayments(allPaymentsForPatient);
      setSelectedPatientAppointments(patientGroup.appointments || []);
      setSelectedAppointment(latestAppointment);

    // Set patient in context for history modal
      if (patientGroup.patient) {
        setSelectedPatient(patientGroup.patient);
    }
    setPaymentModalOpen(true);
    } catch (err) {
      setError("Failed to fetch payment history for this patient");
      console.error("Error fetching patient payments:", err);
    }
  };

  const handlePaymentSaved = () => {
    // Invalidate cache on payment save
    const cacheKey = requestCache.generateKey("/payments", {
      branchId: selectedBranch?.id,
      limit: 50,
    });
    requestCache.delete(cacheKey);
    fetchPayments(true); // Skip cache on updates
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md md:p-6">
      <div className="flex flex-col items-start justify-between gap-3 mb-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-bold">Recent Payments</h2>
          <p className="mt-1 text-sm text-gray-500">
            Recent payments (last 30 days, max 50)
          </p>
        </div>
        <div className="flex gap-2">
          <button
            disabled
            className="bg-indigo-600 text-white px-4 py-2 rounded opacity-50 cursor-not-allowed min-h-[44px] min-w-[44px]"
            title="Use Ctrl+H to access"
            type="button"
          ></button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex-1 min-w-[200px]">
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Status Filter
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Status</option>
              <option value="PAID">Paid</option>
              <option value="PARTIAL">Partial</option>
              <option value="UNPAID">Unpaid</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Search Patient
            </label>
            <input
              type="text"
              value={patientFilter}
              onChange={(e) => setPatientFilter(e.target.value)}
              placeholder="Search by patient name..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center">
          <div className="inline-block w-8 h-8 border-b-2 border-indigo-600 rounded-full animate-spin"></div>
          <p className="mt-2 text-gray-500">Loading payments...</p>
        </div>
      ) : error ? (
        <div className="px-4 py-3 text-red-700 bg-red-100 border border-red-400 rounded">
          {error}
        </div>
      ) : (
        <>
          <DataTable
            data={groupedByPatient}
            columns={columns}
            title="Payments"
            emptyMessage="No payments recorded"
            pageSize={10}
            searchable={true}
            sortable={true}
            pagination={true}
            exportable={true}
            printable={true}
            actions={[
              {
                label: "View Payment History",
                icon: "💰",
                variant: "primary",
                onClick: (patientGroup) => handleUpdatePayment(patientGroup),
              },
            ]}
          />

          {groupedByPatient.length > 0 && (
            <div className="pt-4 mt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Total ({groupedByPatient.length} patient
                  {groupedByPatient.length > 1 ? "s" : ""}):
                </span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(
                    groupedByPatient.reduce(
                      (sum, p) => sum + (p.amount || 0),
                      0
                    )
                  )}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setSelectedAppointment(null);
          setSelectedPatientPayments([]);
          setSelectedPatientAppointments([]);
        }}
        appointment={selectedAppointment}
        allPatientPayments={selectedPatientPayments}
        allPatientAppointments={selectedPatientAppointments}
        onPaymentSaved={handlePaymentSaved}
      />
    </div>
  );
};

export default PaymentsDisplay;
