import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import usePatient from "../../../hooks/usePatient";
import DataTable from "../../common/DataTable";
import PaymentModal from "./PaymentModal";
import { formatDate } from "../../../utils/tableUtils";
import requestCache from "../../../utils/requestCache";

// Helper function to safely convert Decimal or number to number
const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "object" && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

const PrivatePaymentsView = () => {
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
  const [stats, setStats] = useState({
    totalToday: 0,
    pendingPayments: 0,
    overduePayments: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const abortControllerRef = useRef(null);

  const fetchPayments = useCallback(async (skipCache = false) => {
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
      isHidden: "true",
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

      // Request backend to filter by isHidden (backend handles filtering)
      const response = await api.get("/payments", {
        params: {
          branchId: selectedBranch.id,
          isHidden: "true", // Only fetch private/hidden payments
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

      // Map payment data to display format (backend already filters by branch and isHidden)
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
          showDetailedBilling: payment.showDetailedBilling || false,
          isHidden: payment.isHidden || false,
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
  }, [selectedBranch]);

  useEffect(() => {
    if (selectedBranch?.id) {
      fetchPayments();
    }
  }, [selectedBranch, fetchPayments]);

  // Listen for appointment creation and payment update events to refresh payments list
  useEffect(() => {
    const handleAppointmentCreated = () => {
      if (selectedBranch?.id) {
        // Invalidate cache
        const cacheKey = requestCache.generateKey("/payments", {
          branchId: selectedBranch.id,
          isHidden: "true",
        });
        requestCache.delete(cacheKey);
        fetchPayments(true); // Skip cache on updates
      }
    };

    const handlePaymentUpdated = () => {
      if (selectedBranch?.id) {
        // Invalidate cache
        const cacheKey = requestCache.generateKey("/payments", {
          branchId: selectedBranch.id,
          isHidden: "true",
        });
        requestCache.delete(cacheKey);
        fetchPayments(true); // Skip cache on updates
      }
    };

    window.addEventListener("appointment-created", handleAppointmentCreated);
    window.addEventListener("payment-updated", handlePaymentUpdated);
    return () => {
      window.removeEventListener(
        "appointment-created",
        handleAppointmentCreated
      );
      window.removeEventListener("payment-updated", handlePaymentUpdated);
    };
  }, [selectedBranch, fetchPayments]);

  const fetchPaymentStats = useCallback(async () => {
    if (!selectedBranch?.id) return;

    // Use AbortController for request cancellation
    const abortController = new AbortController();

    try {
      setLoadingStats(true);
      const response = await api.get("/payments", {
        params: {
          branchId: selectedBranch.id,
          isHidden: "true", // Only fetch private payments for stats
        },
        signal: abortController.signal,
      });
      const paymentsData = response.data?.data || response.data || [];

      // Handle case where no payments exist yet (empty array is fine)
      if (!Array.isArray(paymentsData)) {
        setStats({ totalToday: 0, pendingPayments: 0, overduePayments: 0 });
        return;
      }

      // Filter to only private payments
      const privatePayments = paymentsData.filter(
        (payment) => payment.isHidden === true
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Calculate today's total private payments
      const todayPayments = privatePayments
        .filter((payment) => {
          const paymentDate = payment.paymentDate
            ? new Date(payment.paymentDate)
            : new Date(payment.createdAt);
          return paymentDate >= today && paymentDate < tomorrow;
        })
        .reduce((sum, payment) => sum + toNumber(payment.paidAmount), 0);

      // Count unpaid and partial private payments
      const pendingPayments = privatePayments.filter(
        (payment) =>
          payment.paymentStatus === "UNPAID" ||
          payment.paymentStatus === "PARTIAL"
      ).length;

      // Count overdue private payments (30+ days, unpaid or partial)
      const todayTimestamp = today.getTime();
      const overduePayments = privatePayments.filter((payment) => {
        if (payment.paymentStatus === "PAID") return false;
        const paymentDate = payment.paymentDate
          ? new Date(payment.paymentDate).getTime()
          : new Date(payment.createdAt).getTime();
        const daysDiff = (todayTimestamp - paymentDate) / (1000 * 60 * 60 * 24);
        return daysDiff > 30;
      }).length;

      setStats({
        totalToday: todayPayments,
        pendingPayments,
        overduePayments,
      });
    } catch (err) {
      // Ignore abort errors
      if (err.name === "AbortError") return;

      // Handle 404 gracefully - just means no payments exist yet
      if (err.response?.status === 404) {
        setStats({ totalToday: 0, pendingPayments: 0, overduePayments: 0 });
      } else {
        console.error("Error fetching payment stats:", err);
      }
    } finally {
      setLoadingStats(false);
    }
  }, [selectedBranch]);

  useEffect(() => {
    if (selectedBranch?.id) {
      fetchPaymentStats();
    }
  }, [selectedBranch, fetchPaymentStats]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  // Filter payments based on filters and branch isolation
  const filteredPayments = useMemo(() => {
    let filtered = payments;

    // Additional security: Filter by branch to ensure only own branch payments are shown
    if (selectedBranch?.id) {
      filtered = filtered.filter((payment) => {
        const paymentBranchId =
          payment.appointment?.branchId || payment.branchId;
        return paymentBranchId === selectedBranch.id;
      });
    }

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

    return filtered;
  }, [payments, statusFilter, patientFilter, selectedBranch?.id]);

  // Prepare columns for DataTable with proper widths
  const columns = [
    {
      key: "date",
      label: "Date & Time",
      sortable: true,
      render: (value) => formatDate(value),
      className: "whitespace-nowrap min-w-[140px]",
    },
    {
      key: "patientName",
      label: "Patient",
      sortable: true,
      searchable: true,
      className: "min-w-[120px]",
    },
    {
      key: "patient.phone",
      label: "Phone",
      sortable: true,
      searchable: true,
      render: (value, row) => row.patient?.phone || "—",
      className: "whitespace-nowrap min-w-[110px]",
    },
    {
      key: "dentist",
      label: "Dentist",
      sortable: true,
      searchable: true,
      className: "min-w-[100px]",
    },
    {
      key: "treatment",
      label: "Treatment",
      render: (value) =>
        value?.procedures?.length > 0
          ? `${value.procedures.length} procedure(s)`
          : "Treatment completed",
      className: "min-w-[130px]",
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (value, row) => (
        <div className="whitespace-nowrap">
          <span className="font-semibold text-green-600">
            {formatCurrency(value)}
          </span>
          {row.paidAmount > 0 && row.paidAmount < value && (
            <p className="text-xs text-gray-500">
              Paid: {formatCurrency(row.paidAmount)}
            </p>
          )}
        </div>
      ),
      className: "whitespace-nowrap min-w-[110px]",
    },
    {
      key: "paymentStatus",
      label: "Status",
      sortable: true,
      render: (value) => {
        const statusColors = {
          PAID: "bg-green-100 text-green-800",
          PARTIAL: "bg-yellow-100 text-yellow-800",
          UNPAID: "bg-red-100 text-red-800",
        };
        return (
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full whitespace-nowrap ${
              statusColors[value] || "bg-gray-100 text-gray-800"
            }`}
          >
            {value || "UNPAID"}
          </span>
        );
      },
      className: "whitespace-nowrap min-w-[90px]",
    },
    {
      key: "showDetailedBilling",
      label: "Billing",
      render: (value) => {
        if (value) {
          return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 whitespace-nowrap">
              Enabled
            </span>
          );
        }
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">
            Basic
          </span>
        );
      },
      className: "whitespace-nowrap min-w-[90px]",
    },
  ];

  if (!selectedBranch) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        Loading branch information...
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-8">Loading payments...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  const handleUpdatePayment = (payment) => {
    setSelectedAppointment(payment.appointment);
    // Set patient in context for history modal
    if (payment.appointment?.patient) {
      setSelectedPatient(payment.appointment.patient);
    }
    setPaymentModalOpen(true);
  };

  const handlePaymentSaved = () => {
    // Invalidate cache on payment save
    const cacheKey = requestCache.generateKey("/payments", {
      branchId: selectedBranch?.id,
      isHidden: "true",
    });
    requestCache.delete(cacheKey);
    fetchPayments(true); // Skip cache on updates
    fetchPaymentStats(); // Refresh statistics when payment is updated
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Private Payments
          </h1>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Private payment history for {selectedBranch.name}
            <span className="ml-2 text-xs text-gray-500">
              (Accessible via Ctrl+H only)
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/reception/payments")}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 min-h-[44px] whitespace-nowrap"
          >
            ← Back to Payments
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {!loadingStats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="p-4 border border-green-200 rounded-lg bg-green-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Today</p>
                <p className="mt-1 text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalToday)}
                </p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </div>
          <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Pending Payments
                </p>
                <p className="mt-1 text-2xl font-bold text-yellow-600">
                  {stats.pendingPayments}
                </p>
              </div>
              <div className="text-3xl">⏳</div>
            </div>
          </div>
          <div className="p-4 border border-red-200 rounded-lg bg-red-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Overdue (30+ days)
                </p>
                <p className="mt-1 text-2xl font-bold text-red-600">
                  {stats.overduePayments}
                </p>
              </div>
              <div className="text-3xl">⚠️</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md w-full">
        {/* Filters */}
        <div className="mb-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="ALL">All Status</option>
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partial</option>
                <option value="UNPAID">Unpaid</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Patient
              </label>
              <input
                type="text"
                value={patientFilter}
                onChange={(e) => setPatientFilter(e.target.value)}
                placeholder="Search by patient name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-gray-500">Loading payments...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        ) : (
          <>
            <div className="w-full overflow-x-auto">
              <DataTable
                data={filteredPayments}
                columns={columns}
                title="Private Payments"
                emptyMessage="No private payments recorded"
                pageSize={50}
                searchable={true}
                sortable={true}
                pagination={true}
                exportable={true}
                printable={true}
                actions={[
                  {
                    label: "Update Payment",
                    icon: "💰",
                    variant: "primary",
                    onClick: (payment) => handleUpdatePayment(payment),
                  },
                ]}
              />
            </div>

            {filteredPayments.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Total ({filteredPayments.length} payments):
                  </span>
                  <span className="text-lg font-bold text-green-600">
                    {formatCurrency(
                      filteredPayments.reduce(
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
          }}
          appointment={selectedAppointment}
          onPaymentSaved={handlePaymentSaved}
        />
      </div>
    </div>
  );
};

export default PrivatePaymentsView;
