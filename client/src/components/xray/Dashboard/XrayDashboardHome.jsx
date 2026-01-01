import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";

const XrayDashboardHome = () => {
  const { selectedBranch } = useBranch();
  const [stats, setStats] = useState({
    pendingRequests: 0,
    completedToday: 0,
    totalRequests: 0,
  });
  const [branches, setBranches] = useState([]);
  const [branchDentists, setBranchDentists] = useState({}); // { branchId: [dentists] }
  const [loading, setLoading] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(true);

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
        (req) => !req.result || req.result.status === "PENDING"
      ).length;

      const completedToday = requests.filter((req) => {
        if (!req.result) return false;
        const resultDate = new Date(req.result.updatedAt);
        return (
          resultDate >= today &&
          resultDate < tomorrow &&
          req.result.status === "COMPLETED"
        );
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

  const fetchBranches = useCallback(async () => {
    try {
      setLoadingBranches(true);
      const response = await api.get("/branches");
      const branchesData = response.data?.data || response.data || [];
      // Filter only active branches
      const activeBranches = branchesData.filter((branch) => branch.isActive);
      setBranches(activeBranches);

      // Fetch all dentists and group by branchId
      // This is more efficient than fetching per branch and handles API limitations
      try {
        const allDentistsResponse = await api.get("/users", {
          params: { role: "DENTIST" },
        });
        const allDentists =
          allDentistsResponse.data?.data || allDentistsResponse.data || [];

        // Group dentists by branchId
        const dentistsByBranch = {};
        activeBranches.forEach((branch) => {
          dentistsByBranch[branch.id] = allDentists.filter(
            (dentist) => dentist.branchId === branch.id
          );
        });
        setBranchDentists(dentistsByBranch);
      } catch (err) {
        console.error("Error fetching dentists:", err);
        // Fallback: initialize empty arrays for all branches
        const dentistsByBranch = {};
        activeBranches.forEach((branch) => {
          dentistsByBranch[branch.id] = [];
        });
        setBranchDentists(dentistsByBranch);
      }
    } catch (err) {
      console.error("Error fetching branches:", err);
    } finally {
      setLoadingBranches(false);
    }
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

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
      link: "/xray/requests",
    },
    {
      label: "Completed Today",
      value: stats.completedToday,
      icon: "✅",
      color: "bg-green-500",
      textColor: "text-green-700",
      bgColor: "bg-green-50",
      link: "/xray/requests",
    },
    {
      label: "Total Requests",
      value: stats.totalRequests,
      icon: "🩻",
      color: "bg-blue-500",
      textColor: "text-blue-700",
      bgColor: "bg-blue-50",
      link: "/xray/requests",
    },
  ];

  if (loadingBranches) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block w-8 h-8 border-b-2 border-indigo-600 rounded-full animate-spin"></div>
        <p className="mt-2 text-gray-500">Loading branches and dentists...</p>
      </div>
    );
  }

  if (!selectedBranch && branches.length === 0) {
    return (
      <div className="px-4 py-3 text-yellow-700 bg-yellow-100 border border-yellow-400 rounded">
        No branches available. Please contact administrator.
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
          {selectedBranch
            ? `Overview of X-Ray examinations for ${selectedBranch.name}`
            : "Overview of all branches and dentists"}
        </p>
      </div>

      {/* Branches and Dentists Overview */}
      <div className="p-4 bg-white rounded-lg shadow-md md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 md:text-xl">
            Branches & Dentists
          </h2>
          <button
            onClick={fetchBranches}
            disabled={loadingBranches}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className={`w-4 h-4 ${loadingBranches ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
        {branches.length === 0 ? (
          <p className="py-4 text-center text-gray-500">No branches found.</p>
        ) : (
          <div className="space-y-4">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className={`border rounded-lg p-4 ${
                  selectedBranch?.id === branch.id
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold text-gray-900 md:text-lg">
                    {branch.name}
                  </h3>
                  {selectedBranch?.id === branch.id && (
                    <span className="px-2 py-1 text-xs text-white bg-indigo-600 rounded-full">
                      Current Branch
                    </span>
                  )}
                </div>
                {branch.address && (
                  <p className="mb-3 text-sm text-gray-600">{branch.address}</p>
                )}
                <div className="mt-3">
                  <p className="mb-2 text-sm font-medium text-gray-700">
                    Dentists ({branchDentists[branch.id]?.length || 0}):
                  </p>
                  {branchDentists[branch.id] &&
                  branchDentists[branch.id].length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {branchDentists[branch.id].map((dentist) => (
                        <span
                          key={dentist.id}
                          className="inline-flex items-center px-3 py-1 text-sm text-blue-800 bg-blue-100 rounded-full"
                        >
                          {dentist.name || dentist.email || "Unknown"}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm italic text-gray-500">
                      No dentists assigned
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!selectedBranch ? (
        <div className="p-6 text-center border border-blue-200 rounded-lg bg-blue-50">
          <p className="font-medium text-blue-800">
            Please select a branch to view X-Ray statistics and quick actions.
          </p>
        </div>
      ) : loading ? (
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

          <div className="p-4 bg-white rounded-lg shadow-md md:p-6">
            <h2 className="mb-4 text-lg font-bold text-gray-900 md:text-xl">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Link
                to="/xray/requests"
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
        </>
      )}
    </div>
  );
};

export default XrayDashboardHome;
