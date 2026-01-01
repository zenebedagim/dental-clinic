import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";

const DentistDashboardHome = () => {
  const { selectedBranch } = useBranch();
  const [stats, setStats] = useState({
    todayAppointments: 0,
    pendingTreatments: 0,
    completedToday: 0,
    xrayRequests: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchDashboardStats = useCallback(async () => {
    if (!selectedBranch?.id) return;
    setLoading(true);
    try {
      // Fetch appointments (already includes xrayResult data)
      const appointmentsResponse = await api.get("/appointments/dentist", {
        params: { branchId: selectedBranch.id },
      });
      const appointments =
        appointmentsResponse.data?.data || appointmentsResponse.data || [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayAppointments = appointments.filter((apt) => {
        const aptDate = new Date(apt.date);
        return aptDate >= today && aptDate < tomorrow;
      });

      const pendingTreatments = appointments.filter(
        (apt) => apt.treatment && apt.treatment.status === "IN_PROGRESS"
      ).length;

      const completedToday = appointments.filter((apt) => {
        if (!apt.treatment) return false;
        const treatmentDate = new Date(apt.treatment.updatedAt);
        return (
          treatmentDate >= today &&
          treatmentDate < tomorrow &&
          apt.treatment.status === "COMPLETED"
        );
      }).length;

      // X-ray requests: appointments where xrayId is set (X-ray was requested)
      // Pending: xrayId exists but no result OR result not sent to dentist yet
      const pendingXrayRequests = appointments.filter((apt) => {
        if (!apt.xrayId) return false; // No X-ray requested
        if (!apt.xrayResult) return true; // X-ray requested but no result yet
        return !apt.xrayResult.sentToDentist; // Result exists but not sent to dentist
      }).length;

      setStats({
        todayAppointments: todayAppointments.length,
        pendingTreatments,
        completedToday,
        xrayRequests: pendingXrayRequests,
      });
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const statCards = [
    {
      label: "Today's Appointments",
      value: stats.todayAppointments,
      icon: "📅",
      color: "bg-blue-500",
      textColor: "text-blue-700",
      bgColor: "bg-blue-50",
      link: "/dentist/patients",
    },
    {
      label: "Pending Treatments",
      value: stats.pendingTreatments,
      icon: "⏳",
      color: "bg-yellow-500",
      textColor: "text-yellow-700",
      bgColor: "bg-yellow-50",
      link: "/dentist/treatment",
    },
    {
      label: "Completed Today",
      value: stats.completedToday,
      icon: "✅",
      color: "bg-green-500",
      textColor: "text-green-700",
      bgColor: "bg-green-50",
      link: "/dentist/treatment",
    },
    {
      label: "X-Ray Requests",
      value: stats.xrayRequests,
      icon: "🩻",
      color: "bg-purple-500",
      textColor: "text-purple-700",
      bgColor: "bg-purple-50",
      link: "/dentist/xray-requests",
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

          <div className="p-4 bg-white rounded-lg shadow-md md:p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900 md:text-xl">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Link
                to="/dentist/patients"
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
              <Link
                to="/dentist/search"
                className="bg-blue-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center font-medium min-h-[44px] flex items-center justify-center"
              >
                🔍 Search Patient
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DentistDashboardHome;
