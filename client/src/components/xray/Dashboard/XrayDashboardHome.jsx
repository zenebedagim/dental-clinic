import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import ChangePassword from "../../common/ChangePassword";

const XrayDashboardHome = () => {
  const { selectedBranch } = useBranch();
  const [stats, setStats] = useState({
    pendingRequests: 0,
    completedToday: 0,
    totalRequests: 0,
  });
  const [loading, setLoading] = useState(true);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);

  const fetchDashboardStats = useCallback(async () => {
    if (!selectedBranch?.id) return;
    setLoading(true);
    try {
      const response = await api.get("/xray", {
        params: { branchId: selectedBranch.id },
      });
      const requests = response.data?.data || response.data || [];

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const pendingRequests = requests.filter(
        (req) => !req.xrayResult || !req.xrayResult.id
      ).length;

      const completedToday = requests.filter((req) => {
        if (!req.xrayResult || !req.xrayResult.id) return false;
        // Check if X-Ray was created or updated today
        const resultDate = new Date(
          req.xrayResult.updatedAt || req.xrayResult.createdAt
        );
        return resultDate >= today && resultDate < tomorrow;
      }).length;

      setStats({
        pendingRequests,
        completedToday,
        totalRequests: requests.length,
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
      label: "Pending Requests",
      value: stats.pendingRequests,
      icon: "⏳",
      color: "bg-yellow-500",
      textColor: "text-yellow-700",
      bgColor: "bg-yellow-50",
      link: "/xray/search?filter=pending",
      filter: "pending",
    },
    {
      label: "Completed Today",
      value: stats.completedToday,
      icon: "✅",
      color: "bg-green-500",
      textColor: "text-green-700",
      bgColor: "bg-green-50",
      link: "/xray/search?filter=completed",
      filter: "completed",
    },
    {
      label: "Total Requests",
      value: stats.totalRequests,
      icon: "🩻",
      color: "bg-blue-500",
      textColor: "text-blue-700",
      bgColor: "bg-blue-50",
      link: "/xray/search?filter=all",
      filter: "all",
    },
  ];

  if (!selectedBranch) {
    return (
      <div className="p-6 text-center border border-blue-200 rounded-lg bg-blue-50">
        <p className="font-medium text-blue-800">
          Please select a branch to view X-Ray statistics and quick actions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
          X-Ray Dashboard
        </h1>
        <p className="mt-2 text-sm text-gray-600 md:text-base">
          Overview of X-Ray examinations for {selectedBranch.name}
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block w-8 h-8 border-b-2 border-indigo-600 rounded-full animate-spin"></div>
          <p className="mt-2 text-gray-500">Loading dashboard...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="p-4 bg-white rounded-lg shadow-md md:p-6">
              <h2 className="mb-4 text-lg font-bold text-gray-900 md:text-xl">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Link
                  to="/xray/search?filter=all"
                  className="bg-indigo-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors text-center font-medium min-h-[44px] flex items-center justify-center"
                >
                  🩻 View X-Ray Requests
                </Link>
                <Link
                  to="/xray/search"
                  className="bg-blue-600 text-white px-4 md:px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center font-medium min-h-[44px] flex items-center justify-center"
                >
                  🔍 Search Patient
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

export default XrayDashboardHome;
