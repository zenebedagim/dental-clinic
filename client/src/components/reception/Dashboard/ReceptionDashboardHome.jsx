import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import { useToast } from "../../../hooks/useToast";
import DataTable from "../../common/DataTable";
import { formatDate } from "../../../utils/tableUtils";

const ReceptionDashboardHome = () => {
  const { selectedBranch } = useBranch();
  const { error: showError } = useToast();
  const navigate = useNavigate();

  // Get user role from localStorage
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;
  const userRole = user?.role || "";

  // Show sections only for DENTIST role, hide for RECEPTION and others
  const showHiddenSections = userRole === "DENTIST";

  const [stats, setStats] = useState({
    expectedToday: 0,
    checkedIn: 0,
    inTreatment: 0,
    completed: 0,
  });
  const [appointments, setAppointments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = useCallback(
    async (abortSignal) => {
      if (!selectedBranch?.id) {
        return;
      }

      try {
        setLoading(true);

        // Parallelize all API calls for faster loading
        const [appointmentsResponse, patientsResponse, paymentsResponse] =
          await Promise.allSettled([
            api.get("/appointments/reception", {
              params: { branchId: selectedBranch.id },
              signal: abortSignal,
            }),
            api.get("/patients", {
              params: {
                branchId: selectedBranch.id,
                limit: 5,
                sortBy: "createdAt",
                sortOrder: "desc",
              },
              signal: abortSignal,
            }),
            api.get("/payments", {
              params: {
                branchId: selectedBranch.id,
              },
              signal: abortSignal,
            }),
          ]);

        // Process appointments
        if (appointmentsResponse.status === "fulfilled") {
          const appointmentsData =
            appointmentsResponse.value.data?.data ||
            appointmentsResponse.value.data ||
            [];

          // Calculate stats for today from all appointments
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          const todayAppointments = appointmentsData.filter((apt) => {
            const aptDate = new Date(apt.date);
            return aptDate >= today && aptDate < tomorrow;
          });

          const expectedToday = todayAppointments.length;
          const checkedIn = todayAppointments.filter(
            (apt) => apt.status === "IN_PROGRESS" || apt.status === "COMPLETED"
          ).length;
          const completed = todayAppointments.filter(
            (apt) => apt.status === "COMPLETED"
          ).length;
          const inTreatment = todayAppointments.filter(
            (apt) => apt.status === "IN_PROGRESS"
          ).length;

          setStats({
            expectedToday,
            checkedIn,
            inTreatment,
            completed,
          });

          // Show today's appointments (for dashboard stats)
          setAppointments(todayAppointments.slice(0, 5));
        } else {
          console.error(
            "Error fetching appointments:",
            appointmentsResponse.reason
          );
          showError("Failed to load appointments");
        }

        // Process patients
        if (patientsResponse.status === "fulfilled") {
          const patientsData =
            patientsResponse.value.data?.data ||
            patientsResponse.value.data ||
            [];
          setRecentPatients(Array.isArray(patientsData) ? patientsData : []);
        } else {
          console.error("Error fetching patients:", patientsResponse.reason);
          setRecentPatients([]);
        }

        // Process payments
        if (paymentsResponse.status === "fulfilled") {
          const allPayments =
            paymentsResponse.value.data?.data ||
            paymentsResponse.value.data ||
            [];

          if (!Array.isArray(allPayments)) {
            setPayments([]);
          } else {
            // Filter for unpaid and partial payments
            const pendingPaymentsList = allPayments
              .filter(
                (payment) =>
                  payment.paymentStatus === "UNPAID" ||
                  payment.paymentStatus === "PARTIAL"
              )
              .slice(0, 5);

            // Map to display format
            const pendingPaymentsDisplay = pendingPaymentsList.map(
              (payment) => ({
                id: payment.appointmentId,
                patientName: payment.appointment?.patientName || "N/A",
                date: payment.appointment?.date || payment.createdAt,
                treatment: payment.appointment?.treatment,
                amount: payment.amount?.toNumber() || 0,
                paidAmount: payment.paidAmount?.toNumber() || 0,
                paymentStatus: payment.paymentStatus,
              })
            );
            setPayments(pendingPaymentsDisplay);
          }
        } else {
          // Handle 404 gracefully - just means no payments exist yet
          if (paymentsResponse.reason?.response?.status === 404) {
            setPayments([]);
          } else {
            console.error("Error fetching payments:", paymentsResponse.reason);
            setPayments([]);
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          showError("Failed to load dashboard statistics");
          console.error("Error fetching dashboard stats:", err);
        }
      } finally {
        setLoading(false);
      }
    },
    [selectedBranch, showError]
  );

  useEffect(() => {
    if (!selectedBranch?.id) return;

    // Use AbortController to cancel request if component unmounts or branch changes
    const abortController = new AbortController();

    fetchDashboardStats(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [selectedBranch, fetchDashboardStats]);

  // Listen for appointment creation events to refresh dashboard
  useEffect(() => {
    const handleAppointmentCreated = () => {
      if (selectedBranch?.id) {
        fetchDashboardStats();
      }
    };

    window.addEventListener("appointment-created", handleAppointmentCreated);
    return () => {
      window.removeEventListener(
        "appointment-created",
        handleAppointmentCreated
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch]);

  // Handle stat card click - navigate to appointments with filters
  const handleStatCardClick = (cardType) => {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

    let statusFilter = "ALL";
    let dateFilter = today;

    switch (cardType) {
      case "expectedToday":
        statusFilter = "ALL";
        dateFilter = today;
        break;
      case "checkedIn":
        // For checked-in, we'll show today's appointments with IN_PROGRESS or COMPLETED
        // Since the API might not support multiple statuses, we'll use IN_PROGRESS as default
        // and let users filter further if needed
        statusFilter = "IN_PROGRESS";
        dateFilter = today;
        break;
      case "inTreatment":
        statusFilter = "IN_PROGRESS";
        dateFilter = today;
        break;
      case "completed":
        statusFilter = "COMPLETED";
        dateFilter = today;
        break;
      default:
        statusFilter = "ALL";
        dateFilter = today;
    }

    navigate(
      `/reception/appointments?status=${statusFilter}&date=${dateFilter}`
    );
  };

  const statCards = [
    {
      label: "Expected Today",
      value: stats.expectedToday,
      icon: "📅",
      color: "bg-blue-500",
      textColor: "text-blue-700",
      bgColor: "bg-blue-50",
      onClick: () => handleStatCardClick("expectedToday"),
    },
    {
      label: "Checked-In",
      value: stats.checkedIn,
      icon: "✅",
      color: "bg-green-500",
      textColor: "text-green-700",
      bgColor: "bg-green-50",
      onClick: () => handleStatCardClick("checkedIn"),
    },
    {
      label: "In Treatment",
      value: stats.inTreatment,
      icon: "🦷",
      color: "bg-yellow-500",
      textColor: "text-yellow-700",
      bgColor: "bg-yellow-50",
      onClick: () => handleStatCardClick("inTreatment"),
    },
    {
      label: "Completed",
      value: stats.completed,
      icon: "✓",
      color: "bg-indigo-500",
      textColor: "text-indigo-700",
      bgColor: "bg-indigo-50",
      onClick: () => handleStatCardClick("completed"),
    },
  ];

  if (!selectedBranch) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        Please select a branch to view dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
          Dashboard
        </h1>
        <p className="text-sm md:text-base text-gray-600 mt-2">
          High-level summary of today's patient flow for{" "}
          <strong>{selectedBranch.name}</strong>
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-gray-500">Loading dashboard...</p>
        </div>
      ) : (
        <>
          {/* Section 1: Visible Section */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((card, index) => (
                <div
                  key={index}
                  onClick={card.onClick}
                  className={`${card.bgColor} rounded-lg shadow-md p-6 border border-gray-200 cursor-pointer hover:shadow-lg transition-shadow duration-200`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {card.label}
                      </p>
                      <p
                        className={`text-2xl md:text-3xl font-bold ${card.textColor} mt-2`}
                      >
                        {card.value}
                      </p>
                    </div>
                    <div
                      className={`${card.color} rounded-full p-2 md:p-3 text-white text-xl md:text-2xl`}
                    >
                      {card.icon}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link
                  to="/reception/appointments/new"
                  className="bg-indigo-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors text-center font-medium min-h-[44px] flex items-center justify-center"
                >
                  ➕ Add New Appointment
                </Link>
                <Link
                  to="/reception/patients"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center font-medium min-h-[44px] flex items-center justify-center"
                >
                  🧍‍♂️ Search Patient
                </Link>
                <Link
                  to="/reception/appointments"
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors text-center font-medium min-h-[44px] flex items-center justify-center"
                >
                  📅 View Today's Appointments
                </Link>
              </div>
            </div>

            {/* Today's Appointments Table */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg md:text-xl font-bold text-gray-900">
                  Today's Appointments
                </h2>
                <Link
                  to="/reception/appointments"
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  View All →
                </Link>
              </div>
              {appointments.length > 0 ? (
                <DataTable
                  data={appointments}
                  columns={[
                    {
                      key: "patientName",
                      label: "Patient",
                      sortable: true,
                    },
                    {
                      key: "date",
                      label: "Time",
                      sortable: true,
                      render: (value) => formatDate(value),
                    },
                    {
                      key: "dentist.name",
                      label: "Dentist",
                      render: (value, row) => row.dentist?.name || "N/A",
                    },
                    {
                      key: "status",
                      label: "Status",
                      render: (value) => (
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            value === "COMPLETED"
                              ? "bg-green-100 text-green-800"
                              : value === "CANCELLED"
                              ? "bg-red-100 text-red-800"
                              : value === "IN_PROGRESS"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {value}
                        </span>
                      ),
                    },
                  ]}
                  title="Today's Appointments"
                  emptyMessage="No appointments for today"
                  pageSize={5}
                  searchable={false}
                  sortable={true}
                  pagination={false}
                  exportable={false}
                  printable={false}
                />
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No appointments for today
                </p>
              )}
            </div>
          </div>

          {/* Section 2: Hidden Section - Visible only for DENTIST */}
          {showHiddenSections && recentPatients.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg md:text-xl font-bold text-gray-900">
                  Recent Patients
                </h2>
                <Link
                  to="/reception/patients"
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  View All →
                </Link>
              </div>
              <DataTable
                data={recentPatients}
                columns={[
                  {
                    key: "name",
                    label: "Name",
                    sortable: true,
                  },
                  {
                    key: "phone",
                    label: "Phone",
                    sortable: true,
                    render: (value) => value || "—",
                  },
                  {
                    key: "createdAt",
                    label: "Date Added",
                    sortable: true,
                    render: (value) => formatDate(value),
                  },
                ]}
                title="Recent Patients"
                emptyMessage="No recent patients"
                pageSize={5}
                searchable={false}
                sortable={true}
                pagination={false}
                exportable={false}
                printable={false}
              />
            </div>
          )}

          {/* Payment Section: Hidden - Visible only for DENTIST */}
          {showHiddenSections && payments.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg md:text-xl font-bold text-gray-900">
                  Pending Payments
                </h2>
                <Link
                  to="/reception/payments"
                  className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                >
                  View All →
                </Link>
              </div>
              <DataTable
                data={payments}
                columns={[
                  {
                    key: "patientName",
                    label: "Patient",
                    sortable: true,
                  },
                  {
                    key: "date",
                    label: "Date",
                    sortable: true,
                    render: (value) => formatDate(value),
                  },
                  {
                    key: "treatment.totalCost",
                    label: "Amount",
                    render: (value, row) =>
                      new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                      }).format(row.treatment?.totalCost || 0),
                  },
                ]}
                title="Pending Payments"
                emptyMessage="No pending payments"
                pageSize={5}
                searchable={false}
                sortable={true}
                pagination={false}
                exportable={false}
                printable={false}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReceptionDashboardHome;
