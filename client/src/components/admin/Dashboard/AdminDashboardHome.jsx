import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";

const AdminDashboardHome = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBranches: 0,
    activeBranches: 0,
    archivedBranches: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Fetch branches
      const branchesResponse = await api.get("/branches", {
        params: { includeArchived: true },
      });
      const branches =
        branchesResponse.data?.data || branchesResponse.data || [];
      const allBranches = Array.isArray(branches) ? branches : [];

      // Fetch users
      const usersResponse = await api.get("/users");
      const users = usersResponse.data?.data || usersResponse.data || [];
      const allUsers = Array.isArray(users) ? users : [];

      setStats({
        totalBranches: allBranches.length,
        activeBranches: allBranches.filter((b) => b.isActive).length,
        archivedBranches: allBranches.filter((b) => !b.isActive).length,
        totalUsers: allUsers.length,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
      // If it's a 401, don't try to fetch - let ProtectedRoute handle redirect
      if (err.response?.status === 401) {
        // Token is invalid, ProtectedRoute will redirect to login
        return;
      }
      // For other errors, show empty stats
      setStats({
        totalBranches: 0,
        activeBranches: 0,
        archivedBranches: 0,
        totalUsers: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Branches",
      value: stats.totalBranches,
      icon: "🏢",
      color: "bg-blue-500",
      onClick: () => navigate("/admin/branches"),
    },
    {
      title: "Active Branches",
      value: stats.activeBranches,
      icon: "✅",
      color: "bg-green-500",
      onClick: () => navigate("/admin/branches"),
    },
    {
      title: "Archived Branches",
      value: stats.archivedBranches,
      icon: "📦",
      color: "bg-gray-500",
      onClick: () => navigate("/admin/branches"),
    },
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: "👥",
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage branches and system settings
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">
          Loading statistics...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat, index) => (
              <div
                key={index}
                onClick={stat.onClick}
                className={`${
                  stat.onClick
                    ? "cursor-pointer hover:shadow-lg transition-shadow"
                    : ""
                } bg-white rounded-lg shadow p-6`}
              >
                <div className="flex items-center">
                  <div
                    className={`${stat.color} rounded-lg p-3 text-white text-2xl`}
                  >
                    {stat.icon}
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                onClick={() => navigate("/admin/branches")}
                className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <span className="mr-2">🏢</span>
                Manage Branches
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboardHome;
