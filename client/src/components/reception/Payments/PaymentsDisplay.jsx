import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import usePatient from "../../../hooks/usePatient";
import DataTable from "../../common/DataTable";
import PaymentModal from "./PaymentModal";
import { formatDate } from "../../../utils/tableUtils";

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

  const fetchPayments = useCallback(async () => {
    if (!selectedBranch?.id) {
      return;
    }

    // Use AbortController for request cancellation
    const abortController = new AbortController();

    try {
      setLoading(true);
      const response = await api.get("/payments", {
        params: { branchId: selectedBranch.id },
        signal: abortController.signal,
      });
      const paymentsData = response.data?.data || response.data || [];

      // Handle case where no payments exist yet (empty array is fine)
      if (!Array.isArray(paymentsData)) {
        setPayments([]);
        return;
      }

      // Map payment data to display format and filter by branch
      const formattedPayments = paymentsData
        .filter((payment) => {
          // Ensure payment belongs to the selected branch
          const paymentBranchId =
            payment.appointment?.branchId || payment.branchId;
          return paymentBranchId === selectedBranch.id;
        })
        .map((payment) => ({
          id: payment.id,
          appointmentId: payment.appointmentId,
          patientName: payment.appointment?.patientName || "N/A",
          patient: payment.appointment?.patient,
          date: payment.appointment?.date || payment.paymentDate,
          dentist: payment.appointment?.dentist?.name || "N/A",
          treatment: payment.appointment?.treatment,
          amount: payment.amount?.toNumber() || 0,
          paidAmount: payment.paidAmount?.toNumber() || 0,
          paymentStatus: payment.paymentStatus,
          paymentMethod: payment.paymentMethod,
          paymentDate: payment.paymentDate,
          showDetailedBilling: payment.showDetailedBilling || false,
          isHidden: payment.isHidden || false,
          appointment: payment.appointment,
          // Include full payment object for detailed billing checks
          payment: payment,
        }));

      // Sort by date (most recent first)
      formattedPayments.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Limit to recent payments (last 50 or last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentPayments = formattedPayments
        .filter((payment) => {
          const paymentDate = new Date(payment.date);
          return paymentDate >= thirtyDaysAgo;
        })
        .slice(0, 50); // Show max 50 recent payments

      setPayments(recentPayments);
    } catch (err) {
      // Handle 404 gracefully - just means no payments exist yet
      if (err.response?.status === 404) {
        setPayments([]);
        setError(""); // Clear error, empty state is fine
      } else {
        setError(err.response?.data?.message || "Failed to fetch payments");
      }
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  useEffect(() => {
    if (selectedBranch?.id) {
      fetchPayments();
    }
  }, [selectedBranch, fetchPayments]);

  // Listen for appointment creation events to refresh payments list
  useEffect(() => {
    const handleAppointmentCreated = () => {
      if (selectedBranch?.id) {
        fetchPayments();
      }
    };

    window.addEventListener("appointment-created", handleAppointmentCreated);
    return () => {
      window.removeEventListener(
        "appointment-created",
        handleAppointmentCreated
      );
    };
  }, [selectedBranch, fetchPayments]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  // Filter payments based on filters
  const filteredPayments = useMemo(() => {
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

    return filtered;
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
        </div>
      ),
    },
    {
      key: "paymentStatus",
      label: "Payment Status",
      sortable: true,
      render: (value) => {
        const statusColors = {
          PAID: "bg-green-100 text-green-800",
          PARTIAL: "bg-yellow-100 text-yellow-800",
          UNPAID: "bg-red-100 text-red-800",
        };
        return (
          <span
            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
              statusColors[value] || "bg-gray-100 text-gray-800"
            }`}
          >
            {value || "UNPAID"}
          </span>
        );
      },
    },
    {
      key: "showDetailedBilling",
      label: "Detailed Billing",
      render: (value) => {
        if (value) {
          return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
              Enabled
            </span>
          );
        }
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-500">
            Basic Only
          </span>
        );
      },
    },
  ];

  if (!selectedBranch) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        Please select a branch to view payments.
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
    fetchPayments();
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <div>
          <h2 className="text-xl font-bold">Recent Payments</h2>
          <p className="text-sm text-gray-500 mt-1">
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
          <DataTable
            data={filteredPayments}
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
                label: "Update Payment",
                icon: "💰",
                variant: "primary",
                onClick: (payment) => handleUpdatePayment(payment),
              },
            ]}
          />

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
  );
};

export default PaymentsDisplay;
