import { useState, useEffect } from "react";
import api from "../../../services/api";
import BranchManagement from "./BranchManagement";
import UserManagement from "./UserManagement";

const AdminBranchManagement = () => {
  const [activeTab, setActiveTab] = useState("branches"); // branches, users
  const [branches, setBranches] = useState([]);

  // Fetch branches for tab count
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await api.get("/branches", {
          params: { includeArchived: false },
        });
        const branchesData = response.data?.data || response.data || [];
        setBranches(Array.isArray(branchesData) ? branchesData : []);
      } catch (err) {
        console.error("Error fetching branches:", err);
      }
    };
    fetchBranches();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
          Branch & User Management
        </h1>
        <p className="mt-2 text-sm text-gray-600 md:text-base">
          Manage clinic branches and users
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex -mb-px space-x-8">
          <button
            onClick={() => setActiveTab("branches")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "branches"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Branches ({branches.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "users"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            User Management
          </button>
        </nav>
      </div>

      {/* Branch Management Tab */}
      {activeTab === "branches" && <BranchManagement />}

      {/* User Management Tab */}
      {activeTab === "users" && <UserManagement />}
    </div>
  );
};

export default AdminBranchManagement;
