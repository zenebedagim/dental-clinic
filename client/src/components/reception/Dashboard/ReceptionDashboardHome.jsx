import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import { useToast } from "../../../hooks/useToast";
import { useReception } from "../../../context/ReceptionContext";
import DataTable from "../../common/DataTable";
import { formatDate } from "../Shared/DateFormatter";
import SkeletonLoader from "../../common/SkeletonLoader";

const ReceptionDashboardHome = () => {
  const { selectedBranch } = useBranch();
  const { error: showError } = useToast();
  const {
    appointments: contextAppointments,
    fetchAppointments: fetchAppointmentsContext,
  } = useReception();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    todayAppointments: 0,
    completedAppointments: 0,
  });

  const fetchDashboardStats = useCallback(
    async (abortSignal) => {
      if (!selectedBranch?.id) {
        return;
      }

      try {
        setLoading(true);

        // Fetch appointment stats from API for comprehensive statistics
        let appointmentStats = null;
        try {
          const statsResponse = await api.get("/appointments/stats", {
            params: { branchId: selectedBranch.id },
            signal: abortSignal,
          });
          appointmentStats = statsResponse.data?.data || statsResponse.data;
        } catch (err) {
          if (err.name !== "AbortError" && err.code !== "ERR_CANCELED") {
            console.error("Error fetching appointment stats:", err);
          }
        }

        // Use context to fetch appointments
        await fetchAppointmentsContext({}, false);

        // Process appointments from context after fetch
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todayAppointments = contextAppointments.filter((apt) => {
          const aptDate = new Date(apt.date);
          return aptDate >= today && aptDate < tomorrow;
        });

        setAppointments(todayAppointments.slice(0, 5));

        // Calculate statistics
        const completedToday = todayAppointments.filter(
          (apt) => apt.status === "COMPLETED"
        ).length;

        // Use API stats if available, otherwise calculate from context
        setStats({
          todayAppointments:
            appointmentStats?.today || todayAppointments.length,
          completedAppointments: appointmentStats?.completed || completedToday,
        });
      } catch (err) {
        if (err.name !== "AbortError" && err.code !== "ERR_CANCELED") {
          showError("Failed to load dashboard statistics");
          console.error("Error fetching dashboard stats:", err);
        }
      } finally {
        setLoading(false);
      }
    },
    [selectedBranch, showError, fetchAppointmentsContext, contextAppointments]
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
        // Refresh context data instead of full refetch
        fetchAppointmentsContext({}, true);
        fetchDashboardStats(null);
      }
    };

    window.addEventListener("appointment-created", handleAppointmentCreated);
    return () => {
      window.removeEventListener(
        "appointment-created",
        handleAppointmentCreated
      );
    };
  }, [selectedBranch, fetchDashboardStats, fetchAppointmentsContext]);

  if (!selectedBranch) {
    return (
      <div className="px-4 py-3 text-yellow-700 bg-yellow-100 border border-yellow-400 rounded">
        Please select a branch to view dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-600 md:text-base">
          High-level summary of today's patient flow for{" "}
          <strong>{selectedBranch.name}</strong>
        </p>
      </div>

      {loading ? (
        <div className="space-y-6">
          <SkeletonLoader count={3} height="h-32" />
          <SkeletonLoader count={1} height="h-64" />
        </div>
      ) : (
        <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Link
              to={`/reception/appointments?date=${
                new Date().toISOString().split("T")[0]
              }`}
              className="block p-4 bg-white rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow hover:bg-blue-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Today's Appointments
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {stats.todayAppointments}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <span className="text-2xl">📅</span>
                </div>
              </div>
            </Link>
            <Link
              to="/reception/patients"
              className="block p-4 bg-white rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow hover:bg-purple-50"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Completed Today
                  </p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">
                    {stats.completedAppointments}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <span className="text-2xl">✅</span>
                </div>
              </div>
            </Link>
          </div>

          {/* Section 1: Visible Section */}
          <div className="space-y-6">
            <div className="p-4 bg-white rounded-lg shadow-md md:p-6">
              <h2 className="mb-4 text-lg font-bold text-gray-900 md:text-xl">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
            <div className="p-4 bg-white rounded-lg shadow-md md:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 md:text-xl">
                  Today's Appointments
                </h2>
                <Link
                  to="/reception/appointments"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
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
                <p className="py-4 text-center text-gray-500">
                  No appointments for today
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReceptionDashboardHome;
