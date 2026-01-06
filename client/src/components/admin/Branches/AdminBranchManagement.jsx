import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";
import { useToast } from "../../../hooks/useToast";
import DataTable from "../../common/DataTable";
import Modal from "../../common/Modal";
import ConfirmDialog from "../../common/ConfirmDialog";
import Loader from "../../common/Loader";
import { formatDate } from "../../../utils/tableUtils";

const AdminBranchManagement = () => {
  const [activeTab, setActiveTab] = useState("branches"); // branches, users

  // Branch Management State
  const [branches, setBranches] = useState([]);
  const [branchLoading, setBranchLoading] = useState(true);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchFormData, setBranchFormData] = useState({
    name: "",
    code: "",
    address: "",
    taxNumber: "",
  });
  const [branchFormErrors, setBranchFormErrors] = useState({});
  const [showArchived, setShowArchived] = useState(false);

  // User Management State
  const [users, setUsers] = useState([]);
  const [userLoading, setUserLoading] = useState(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isDeleteUserDialogOpen, setIsDeleteUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("RECEPTION"); // RECEPTION, DENTIST, XRAY
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("");
  const [userFormData, setUserFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "RECEPTION",
    branchId: "",
    specialization: "",
  });
  const [userFormErrors, setUserFormErrors] = useState({});

  const { success, error: showError } = useToast();

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    try {
      setBranchLoading(true);
      const response = await api.get("/branches", {
        params: { includeArchived: showArchived },
      });
      const branchesData = response.data?.data || response.data || [];
      setBranches(Array.isArray(branchesData) ? branchesData : []);
    } catch (err) {
      console.error("Error fetching branches:", err);
      showError("Failed to load branches");
    } finally {
      setBranchLoading(false);
    }
  }, [showArchived, showError]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setUserLoading(true);
      const params = {};
      if (selectedRole) {
        params.role = selectedRole;
      }
      if (selectedBranchFilter) {
        params.branchId = selectedBranchFilter;
      }
      const response = await api.get("/users", { params });
      const usersData = response.data?.data || response.data || [];
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error("Error fetching users:", err);
      showError("Failed to load users");
    } finally {
      setUserLoading(false);
    }
  }, [selectedRole, selectedBranchFilter, showError]);

  useEffect(() => {
    if (activeTab === "branches") {
      fetchBranches();
    } else if (activeTab === "users") {
      fetchUsers();
      fetchBranches(); // Also fetch branches for the branch selector
    }
  }, [activeTab, fetchBranches, fetchUsers]);

  // Branch Management Functions
  const validateBranchForm = () => {
    const errors = {};
    if (!branchFormData.name.trim()) {
      errors.name = "Name is required";
    }
    if (!branchFormData.code.trim()) {
      errors.code = "Code is required";
    }
    if (!branchFormData.address.trim()) {
      errors.address = "Address is required";
    }
    if (!branchFormData.taxNumber.trim()) {
      errors.taxNumber = "Tax Number is required";
    }
    setBranchFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenBranchModal = (branch = null) => {
    if (branch) {
      setSelectedBranch(branch);
      setBranchFormData({
        name: branch.name || "",
        code: branch.code || "",
        address: branch.address || "",
        taxNumber: branch.taxNumber || "",
      });
    } else {
      setSelectedBranch(null);
      setBranchFormData({
        name: "",
        code: "",
        address: "",
        taxNumber: "",
      });
    }
    setBranchFormErrors({});
    setIsBranchModalOpen(true);
  };

  const handleCloseBranchModal = () => {
    setIsBranchModalOpen(false);
    setSelectedBranch(null);
    setBranchFormData({
      name: "",
      code: "",
      address: "",
      taxNumber: "",
    });
    setBranchFormErrors({});
  };

  const handleBranchSubmit = async (e) => {
    e.preventDefault();
    if (!validateBranchForm()) return;

    try {
      if (selectedBranch) {
        await api.put(`/branches/${selectedBranch.id}`, branchFormData);
        success("Branch updated successfully");
      } else {
        await api.post("/branches", branchFormData);
        success("Branch created successfully");
      }
      handleCloseBranchModal();
      fetchBranches();
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?._message ||
        "Failed to save branch";
      showError(errorMessage);
    }
  };

  const handleArchive = async () => {
    if (!selectedBranch) return;
    try {
      // #region agent log
      fetch("http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "AdminBranchManagement.jsx:173",
          message: "archive branch request",
          data: {
            branchId: selectedBranch.id,
            branchName: selectedBranch.name,
          },
          timestamp: Date.now(),
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "H1",
        }),
      }).catch(() => {});
      // #endregion
      await api.patch(`/branches/${selectedBranch.id}/archive`);
      success("Branch archived successfully");
      setIsDeleteDialogOpen(false);
      setSelectedBranch(null);
      fetchBranches();
    } catch (err) {
      // #region agent log
      fetch("http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "AdminBranchManagement.jsx:182",
          message: "archive branch error",
          data: {
            branchId: selectedBranch.id,
            status: err.response?.status,
            errorMessage: err.response?.data?.message,
            errorData: err.response?.data,
          },
          timestamp: Date.now(),
          sessionId: "debug-session",
          runId: "run1",
          hypothesisId: "H1",
        }),
      }).catch(() => {});
      // #endregion
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?._message ||
        "Failed to archive branch";
      showError(errorMessage);
    }
  };

  const handleRestore = async () => {
    if (!selectedBranch) return;
    try {
      await api.patch(`/branches/${selectedBranch.id}/restore`);
      success("Branch restored successfully");
      setIsRestoreDialogOpen(false);
      setSelectedBranch(null);
      fetchBranches();
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?._message ||
        "Failed to restore branch";
      showError(errorMessage);
    }
  };

  // User Management Functions
  const validateUserForm = () => {
    const errors = {};
    if (!userFormData.name.trim()) {
      errors.name = "Name is required";
    }
    if (!userFormData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userFormData.email)) {
      errors.email = "Invalid email format";
    }
    if (!selectedUser && !userFormData.password.trim()) {
      errors.password = "Password is required";
    } else if (!selectedUser && userFormData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    if (!userFormData.branchId) {
      errors.branchId = "Branch is required";
    }
    if (userFormData.role === "DENTIST" && !userFormData.specialization.trim()) {
      errors.specialization = "Specialization is required for dentists";
    }
    setUserFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenUserModal = (user = null) => {
    if (user) {
      setSelectedUser(user);
      setUserFormData({
        name: user.name || "",
        email: user.email || "",
        password: "",
        role: user.role || "RECEPTION",
        branchId: user.branchId || "",
        specialization: user.specialization || "",
      });
    } else {
      setSelectedUser(null);
      setUserFormData({
        name: "",
        email: "",
        password: "",
        role: selectedRole,
        branchId: "",
        specialization: "",
      });
    }
    setUserFormErrors({});
    setIsUserModalOpen(true);
  };

  const handleCloseUserModal = () => {
    setIsUserModalOpen(false);
    setSelectedUser(null);
    setUserFormData({
      name: "",
      email: "",
      password: "",
      role: selectedRole,
      branchId: "",
      specialization: "",
    });
    setUserFormErrors({});
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (!validateUserForm()) return;

    try {
      const submitData = { ...userFormData };
      if (selectedUser) {
        // Update - don't send password if empty
        if (!submitData.password) {
          delete submitData.password;
        }
        await api.put(`/users/${selectedUser.id}`, submitData);
        success("User updated successfully");
      } else {
        // Create - password is required
        await api.post("/users", submitData);
        success("User created successfully");
      }
      handleCloseUserModal();
      fetchUsers();
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?._message ||
        "Failed to save user";
      showError(errorMessage);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      await api.delete(`/users/${selectedUser.id}`);
      success("User deleted successfully");
      setIsDeleteUserDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?._message ||
        "Failed to delete user";
      showError(errorMessage);
    }
  };

  const activeBranches = branches.filter((b) => b.isActive);

  // Branch Columns
  const branchColumns = [
    {
      key: "code",
      label: "Code",
      sortable: true,
    },
    {
      key: "name",
      label: "Name",
      sortable: true,
    },
    {
      key: "address",
      label: "Address",
      sortable: true,
    },
    {
      key: "taxNumber",
      label: "Tax Number",
      sortable: true,
    },
    {
      key: "isActive",
      label: "Status",
      render: (value) => (
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            value ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {value ? "Active" : "Archived"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (value, row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleOpenBranchModal(row)}
            className="px-3 py-1 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
          >
            Edit
          </button>
          {row.isActive ? (
            <button
              onClick={() => {
                setSelectedBranch(row);
                setIsDeleteDialogOpen(true);
              }}
              className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700"
            >
              Archive
            </button>
          ) : (
            <button
              onClick={() => {
                setSelectedBranch(row);
                setIsRestoreDialogOpen(true);
              }}
              className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
            >
              Restore
            </button>
          )}
        </div>
      ),
    },
  ];

  // User Columns
  const userColumns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
    },
    {
      key: "role",
      label: "Role",
      render: (value) => (
        <span
          className={`px-2 py-1 text-xs font-semibold rounded-full ${
            value === "DENTIST"
              ? "bg-blue-100 text-blue-800"
              : value === "RECEPTION"
              ? "bg-purple-100 text-purple-800"
              : value === "XRAY"
              ? "bg-teal-100 text-teal-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {value}
        </span>
      ),
      sortable: true,
    },
    {
      key: "branch.name",
      label: "Branch",
      render: (value, row) => row.branch?.name || "N/A",
      sortable: true,
    },
    {
      key: "branch.code",
      label: "Branch Code",
      render: (value, row) => row.branch?.code || "N/A",
      sortable: true,
    },
    {
      key: "specialization",
      label: "Specialization",
      render: (value) => value || "—",
    },
    {
      key: "createdAt",
      label: "Created At",
      render: (value) => formatDate(value),
      sortable: true,
    },
    {
      key: "actions",
      label: "Actions",
      render: (value, row) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleOpenUserModal(row)}
            className="px-3 py-1 text-sm text-white bg-indigo-600 rounded hover:bg-indigo-700"
          >
            Edit
          </button>
          <button
            onClick={() => {
              setSelectedUser(row);
              setIsDeleteUserDialogOpen(true);
            }}
            className="px-3 py-1 text-sm text-white bg-red-600 rounded hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  if (branchLoading && activeTab === "branches") {
    return <Loader />;
  }

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
        <nav className="-mb-px flex space-x-8">
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
            User Management ({users.length})
          </button>
        </nav>
      </div>

      {/* Branch Management Tab */}
      {activeTab === "branches" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Branches</h2>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowArchived(!showArchived)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {showArchived ? "Hide Archived" : "Show Archived"}
              </button>
              <button
                onClick={() => handleOpenBranchModal()}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                ➕ Add Branch
              </button>
            </div>
          </div>

          <DataTable
            data={branches}
            columns={branchColumns}
            title="Branches"
            emptyMessage="No branches found"
            searchable={true}
            sortable={true}
            pagination={true}
            pageSize={10}
            exportable={true}
            printable={true}
          />
        </div>
      )}

      {/* User Management Tab */}
      {activeTab === "users" && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => {
                    setSelectedRole(e.target.value);
                    setUserFormData({ ...userFormData, role: e.target.value });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="RECEPTION">Reception</option>
                  <option value="DENTIST">Dentist</option>
                  <option value="XRAY">X-Ray</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch Filter
                </label>
                <select
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Branches</option>
                  {activeBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => handleOpenUserModal()}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  ➕ Add {selectedRole === "RECEPTION" ? "Reception" : selectedRole === "DENTIST" ? "Dentist" : "X-Ray"} User
                </button>
              </div>
            </div>
          </div>

          {userLoading ? (
            <Loader />
          ) : (
            <DataTable
              data={users}
              columns={userColumns}
              title={`${selectedRole} Users`}
              emptyMessage={`No ${selectedRole.toLowerCase()} users found`}
              searchable={true}
              sortable={true}
              pagination={true}
              pageSize={10}
              exportable={true}
              printable={true}
            />
          )}
        </div>
      )}

      {/* Branch Create/Edit Modal */}
      <Modal
        isOpen={isBranchModalOpen}
        onClose={handleCloseBranchModal}
        title={selectedBranch ? "Edit Branch" : "Add New Branch"}
        size="medium"
      >
        <form onSubmit={handleBranchSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Name *
            </label>
            <input
              type="text"
              id="name"
              value={branchFormData.name}
              onChange={(e) =>
                setBranchFormData({ ...branchFormData, name: e.target.value })
              }
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                branchFormErrors.name ? "border-red-500" : "border-gray-300"
              }`}
            />
            {branchFormErrors.name && (
              <p className="mt-1 text-sm text-red-600">{branchFormErrors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="code"
              className="block text-sm font-medium text-gray-700"
            >
              Code *
            </label>
            <input
              type="text"
              id="code"
              value={branchFormData.code}
              onChange={(e) =>
                setBranchFormData({ ...branchFormData, code: e.target.value })
              }
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                branchFormErrors.code ? "border-red-500" : "border-gray-300"
              }`}
            />
            {branchFormErrors.code && (
              <p className="mt-1 text-sm text-red-600">{branchFormErrors.code}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-700"
            >
              Address *
            </label>
            <textarea
              id="address"
              rows={3}
              value={branchFormData.address}
              onChange={(e) =>
                setBranchFormData({
                  ...branchFormData,
                  address: e.target.value,
                })
              }
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                branchFormErrors.address ? "border-red-500" : "border-gray-300"
              }`}
            />
            {branchFormErrors.address && (
              <p className="mt-1 text-sm text-red-600">
                {branchFormErrors.address}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="taxNumber"
              className="block text-sm font-medium text-gray-700"
            >
              Tax Number *
            </label>
            <input
              type="text"
              id="taxNumber"
              value={branchFormData.taxNumber}
              onChange={(e) =>
                setBranchFormData({
                  ...branchFormData,
                  taxNumber: e.target.value,
                })
              }
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                branchFormErrors.taxNumber ? "border-red-500" : "border-gray-300"
              }`}
            />
            {branchFormErrors.taxNumber && (
              <p className="mt-1 text-sm text-red-600">
                {branchFormErrors.taxNumber}
              </p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCloseBranchModal}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {selectedBranch ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      {/* User Create/Edit Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={handleCloseUserModal}
        title={selectedUser ? "Edit User" : `Add New ${selectedRole} User`}
        size="medium"
      >
        <form onSubmit={handleUserSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="user-name"
              className="block text-sm font-medium text-gray-700"
            >
              Name *
            </label>
            <input
              type="text"
              id="user-name"
              value={userFormData.name}
              onChange={(e) =>
                setUserFormData({ ...userFormData, name: e.target.value })
              }
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                userFormErrors.name ? "border-red-500" : "border-gray-300"
              }`}
            />
            {userFormErrors.name && (
              <p className="mt-1 text-sm text-red-600">{userFormErrors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="user-email"
              className="block text-sm font-medium text-gray-700"
            >
              Email *
            </label>
            <input
              type="email"
              id="user-email"
              value={userFormData.email}
              onChange={(e) =>
                setUserFormData({ ...userFormData, email: e.target.value })
              }
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                userFormErrors.email ? "border-red-500" : "border-gray-300"
              }`}
            />
            {userFormErrors.email && (
              <p className="mt-1 text-sm text-red-600">{userFormErrors.email}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="user-password"
              className="block text-sm font-medium text-gray-700"
            >
              Password {selectedUser ? "(leave blank to keep current)" : "*"}
            </label>
            <input
              type="password"
              id="user-password"
              value={userFormData.password}
              onChange={(e) =>
                setUserFormData({ ...userFormData, password: e.target.value })
              }
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                userFormErrors.password ? "border-red-500" : "border-gray-300"
              }`}
            />
            {userFormErrors.password && (
              <p className="mt-1 text-sm text-red-600">
                {userFormErrors.password}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="user-role"
              className="block text-sm font-medium text-gray-700"
            >
              Role *
            </label>
            <select
              id="user-role"
              value={userFormData.role}
              onChange={(e) =>
                setUserFormData({ ...userFormData, role: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="RECEPTION">Reception</option>
              <option value="DENTIST">Dentist</option>
              <option value="XRAY">X-Ray</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="user-branch"
              className="block text-sm font-medium text-gray-700"
            >
              Branch *
            </label>
            <select
              id="user-branch"
              value={userFormData.branchId}
              onChange={(e) =>
                setUserFormData({ ...userFormData, branchId: e.target.value })
              }
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                userFormErrors.branchId ? "border-red-500" : "border-gray-300"
              }`}
            >
              <option value="">Select a branch...</option>
              {activeBranches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} ({branch.code})
                </option>
              ))}
            </select>
            {userFormErrors.branchId && (
              <p className="mt-1 text-sm text-red-600">
                {userFormErrors.branchId}
              </p>
            )}
          </div>

          {userFormData.role === "DENTIST" && (
            <div>
              <label
                htmlFor="user-specialization"
                className="block text-sm font-medium text-gray-700"
              >
                Specialization *
              </label>
              <input
                type="text"
                id="user-specialization"
                value={userFormData.specialization}
                onChange={(e) =>
                  setUserFormData({
                    ...userFormData,
                    specialization: e.target.value,
                  })
                }
                placeholder="e.g., Orthodontics, Oral Surgery"
                className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                  userFormErrors.specialization
                    ? "border-red-500"
                    : "border-gray-300"
                }`}
              />
              {userFormErrors.specialization && (
                <p className="mt-1 text-sm text-red-600">
                  {userFormErrors.specialization}
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleCloseUserModal}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {selectedUser ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Archive Branch Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false);
          setSelectedBranch(null);
        }}
        onConfirm={handleArchive}
        title="Archive Branch"
        message={`Are you sure you want to archive "${selectedBranch?.name}"? This will mark the branch as inactive.`}
        confirmText="Archive"
        cancelText="Cancel"
        variant="warning"
      />

      {/* Restore Branch Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isRestoreDialogOpen}
        onClose={() => {
          setIsRestoreDialogOpen(false);
          setSelectedBranch(null);
        }}
        onConfirm={handleRestore}
        title="Restore Branch"
        message={`Are you sure you want to restore "${selectedBranch?.name}"? The branch will be marked as active.`}
        confirmText="Restore"
        cancelText="Cancel"
        variant="info"
      />

      {/* Delete User Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteUserDialogOpen}
        onClose={() => {
          setIsDeleteUserDialogOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleDeleteUser}
        title="Delete User"
        message={`Are you sure you want to delete "${selectedUser?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default AdminBranchManagement;
