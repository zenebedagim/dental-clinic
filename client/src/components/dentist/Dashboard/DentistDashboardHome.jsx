import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import ChangePassword from "../../common/ChangePassword";

const DentistDashboardHome = () => {
  const { selectedBranch } = useBranch();
  const [stats, setStats] = useState({
    todayAppointments: 0,
    pendingTreatments: 0,
    completedToday: 0,
    xrayRequests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const fetchDashboardStats = useCallback(async () => {
    if (!selectedBranch?.id) return;
    setLoading(true);
    try {
      // Fetch appointments - already filtered by dentist role via /appointments/dentist endpoint
      // This endpoint only returns appointments for the authenticated dentist
      const appointmentsResponse = await api.get("/appointments/dentist", {
        params: { branchId: selectedBranch.id },
      });
      const appointments =
        appointmentsResponse.data?.data || appointmentsResponse.data || [];

      // Pre-calculate dates once for better performance
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Single pass through appointments for better performance
      let todayAppointmentsCount = 0;
      let pendingTreatmentsCount = 0;
      let completedTodayCount = 0;
      let pendingXrayRequestsCount = 0;

      appointments.forEach((apt) => {
        const aptDate = new Date(apt.date);
        const isToday = aptDate >= today && aptDate < tomorrow;

        // Count today's appointments
        if (isToday) {
          todayAppointmentsCount++;
        }

        // Count pending treatments (only for this dentist)
        if (apt.treatment?.status === "IN_PROGRESS") {
          pendingTreatmentsCount++;
        }

        // Count completed treatments today (only for this dentist)
        if (apt.treatment?.status === "COMPLETED") {
          const treatmentDate = new Date(apt.treatment.updatedAt);
          if (treatmentDate >= today && treatmentDate < tomorrow) {
            completedTodayCount++;
          }
        }

        // Count pending X-ray requests (only for this dentist's appointments)
        if (apt.xrayId) {
          if (!apt.xrayResult || !apt.xrayResult.sentToDentist) {
            pendingXrayRequestsCount++;
          }
        }
      });

      setStats({
        todayAppointments: todayAppointmentsCount,
        pendingTreatments: pendingTreatmentsCount,
        completedToday: completedTodayCount,
        xrayRequests: pendingXrayRequestsCount,
      });
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      // Set stats to 0 on error
      setStats({
        todayAppointments: 0,
        pendingTreatments: 0,
        completedToday: 0,
        xrayRequests: 0,
      });
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // Stats cards - all links go to dentist-specific pages that filter by role
  // The endpoints (/appointments/dentist, etc.) automatically filter by authenticated dentist
  const statCards = [
    {
      label: "Appointments",
      value: stats.todayAppointments,
      icon: "📅",
      color: "bg-blue-500",
      textColor: "text-blue-700",
      bgColor: "bg-blue-50",
      link: "/dentist/patients",
      // No filter - shows all appointments (new appointments with status PENDING)
    },
    {
      label: "In Progress",
      value: stats.pendingTreatments,
      icon: "⏳",
      color: "bg-yellow-500",
      textColor: "text-yellow-700",
      bgColor: "bg-yellow-50",
      link: "/dentist/patients",
      state: { filter: "inProgress", searchMode: true }, // Pass searchMode to show Search All Patients view
    },
    {
      label: "Completed",
      value: stats.completedToday,
      icon: "✅",
      color: "bg-green-500",
      textColor: "text-green-700",
      bgColor: "bg-green-50",
      link: "/dentist/patients",
      state: { filter: "completed", searchMode: true }, // Pass searchMode to show Search All Patients view
    },
    {
      label: "X-Ray Requests",
      value: stats.xrayRequests,
      icon: "🩻",
      color: "bg-purple-500",
      textColor: "text-purple-700",
      bgColor: "bg-purple-50",
      link: "/dentist/xray-requests", // Uses /appointments/dentist endpoint (role-filtered)
    },
  ];

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
          Dentist Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-600 md:text-base">
          Overview of your daily workflow for{" "}
          <strong>{selectedBranch.name}</strong>
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block w-8 h-8 border-b-2 border-indigo-600 rounded-full animate-spin"></div>
          <p className="mt-2 text-gray-500">Loading dashboard...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((card, index) => (
              <Link
                key={index}
                to={card.link}
                state={card.state || {}}
                className={`${card.bgColor} rounded-lg shadow-md p-4 md:p-6 border border-gray-200 hover:shadow-lg transition-shadow`}
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
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="p-4 bg-white rounded-lg shadow-md md:p-6">
              <h2 className="mb-4 text-lg font-bold text-gray-900 md:text-xl">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Link
                  to="/dentist/patients"
                  state={{ searchMode: true }}
                  className="bg-indigo-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors text-center font-medium min-h-[44px] flex items-center justify-center"
                >
                  👥 View My Patients
                </Link>
                <Link
                  to="/dentist/treatment"
                  className="bg-green-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-green-700 transition-colors text-center font-medium min-h-[44px] flex items-center justify-center"
                >
                  🦷 Start Treatment
                </Link>
              </div>
            </div>

            {/* Account Settings */}
            <div className="p-4 bg-white rounded-lg shadow-md md:p-6">
              <h2 className="mb-4 text-lg font-bold text-gray-900 md:text-xl">
                Account Settings
              </h2>
              <div className="space-y-3">
                <button
                  onClick={() => setChangePasswordOpen(true)}
                  className="w-full px-4 py-3 text-center text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors font-medium min-h-[44px] flex items-center justify-center"
                >
                  🔒 Change Password
                </button>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>Security Note:</strong> Keep your password secure
                    and change it regularly for better account protection.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Change Password Modal */}
      <ChangePassword
        isOpen={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />
    </div>
  );
};

export default DentistDashboardHome;
