import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import PaymentsDisplay from "./PaymentsDisplay";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import useRoleAccess from "../../../hooks/useRoleAccess";

const ReceptionPaymentsView = () => {
  const { selectedBranch, setSelectedBranch } = useBranch();
  const { isRole } = useRoleAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const isDentist = isRole("DENTIST");
  const [branches, setBranches] = useState([]);
  const [paymentViewMode, setPaymentViewMode] = useState("visible"); // "visible" or "private"

  // Sync payment view mode with current route
  useEffect(() => {
    if (location.pathname === "/reception/payments/private") {
      setPaymentViewMode("private");
    } else if (location.pathname === "/reception/payments") {
      setPaymentViewMode("visible");
    }
  }, [location.pathname]);
  const [stats, setStats] = useState({
    totalToday: 0,
    pendingPayments: 0,
    overduePayments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const fetchBranches = async () => {
    try {
      setLoadingBranches(true);
      const response = await api.get("/branches");
      const branchesData = response.data?.data || response.data || [];
      const activeBranches = branchesData.filter((branch) => branch.isActive);
      setBranches(activeBranches);
    } catch (err) {
      console.error("Error fetching branches:", err);
    } finally {
      setLoadingBranches(false);
    }
  };

  const fetchPaymentStats = useCallback(async () => {
    if (!selectedBranch?.id) return;

    // Use AbortController for request cancellation
    const abortController = new AbortController();

    try {
      setLoading(true);
      const response = await api.get("/payments", {
        params: { branchId: selectedBranch.id },
        signal: abortController.signal,
      });
      const payments = response.data?.data || response.data || [];

      // Handle case where no payments exist yet (empty array is fine)
      if (!Array.isArray(payments)) {
        console.warn("Payments API returned non-array data:", payments);
        setStats({ totalToday: 0, pendingPayments: 0, overduePayments: 0 });
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Calculate today's total payments
      const todayPayments = payments
        .filter((payment) => {
          const paymentDate = payment.paymentDate
            ? new Date(payment.paymentDate)
            : new Date(payment.createdAt);
          return paymentDate >= today && paymentDate < tomorrow;
        })
        .reduce(
          (sum, payment) => sum + (payment.paidAmount?.toNumber() || 0),
          0
        );

      // Count unpaid and partial payments
      const pendingPayments = payments.filter(
        (payment) =>
          payment.paymentStatus === "UNPAID" ||
          payment.paymentStatus === "PARTIAL"
      ).length;

      // Count overdue payments (30+ days, unpaid or partial)
      const todayTimestamp = today.getTime();
      const overduePayments = payments.filter((payment) => {
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
      setLoading(false);
    }
  }, [selectedBranch]);

  // Fetch branches if dentist (only once, cache result)
  useEffect(() => {
    if (isDentist && branches.length === 0) {
      fetchBranches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDentist]);

  useEffect(() => {
    if (selectedBranch?.id) {
      fetchPaymentStats();
    }
  }, [selectedBranch, fetchPaymentStats]);

  // Listen for appointment creation events to refresh payment stats
  useEffect(() => {
    const handleAppointmentCreated = () => {
      if (selectedBranch?.id) {
        fetchPaymentStats();
      }
    };

    window.addEventListener("appointment-created", handleAppointmentCreated);
    return () => {
      window.removeEventListener(
        "appointment-created",
        handleAppointmentCreated
      );
    };
  }, [selectedBranch, fetchPaymentStats]);

  const handleBranchChange = (branchId) => {
    const branch = branches.find((b) => b.id === branchId);
    if (branch) {
      setSelectedBranch(branch);
    }
  };

  const handlePaymentViewModeChange = (mode) => {
    setPaymentViewMode(mode);
    if (mode === "private") {
      navigate("/reception/payments/private");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount || 0);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Payments / Billing
          </h1>
          <p className="mt-2 text-sm text-gray-600 sm:text-base">
            Payment collection and billing management
            {selectedBranch && ` - ${selectedBranch.name}`}
          </p>
        </div>

        {/* Branch Selector (for dentists with multiple branches) */}
        {isDentist && branches.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Branch:</label>
            <select
              value={selectedBranch?.id || ""}
              onChange={(e) => handleBranchChange(e.target.value)}
              disabled={loadingBranches}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              {loadingBranches ? (
                <option>Loading branches...</option>
              ) : (
                branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        {/* Private/Visible Toggle (for dentists only) */}
        {isDentist && (
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => handlePaymentViewModeChange("visible")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                paymentViewMode === "visible"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Visible Payments
            </button>
            <button
              onClick={() => handlePaymentViewModeChange("private")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                paymentViewMode === "private"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Private Payments
            </button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {!loading && (
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

      <PaymentsDisplay />
    </div>
  );
};

export default ReceptionPaymentsView;
