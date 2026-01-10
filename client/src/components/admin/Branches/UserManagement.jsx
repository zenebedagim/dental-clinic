import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";
import { useToast } from "../../../hooks/useToast";
import DataTable from "../../common/DataTable";
import Modal from "../../common/Modal";
import Loader from "../../common/Loader";
import PasswordVerification from "../../common/PasswordVerification";
import { getSocket, on, off, initializeSocket } from "../../../services/socketService";
import { formatDate } from "../../../utils/tableUtils";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [userLoading, setUserLoading] = useState(true);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState("RECEPTION"); // RECEPTION, DENTIST, XRAY
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("");
  const [branches, setBranches] = useState([]);
  const [userFormData, setUserFormData] = useState({
    phone: "",
    password: "",
    role: "RECEPTION",
    name: "",
    branchId: "",
    specialization: "",
  });
  const [userFormErrors, setUserFormErrors] = useState({});
  const [isPasswordVerificationOpen, setIsPasswordVerificationOpen] = useState(false);
  const [pendingPasswordAction, setPendingPasswordAction] = useState(null);
  const [isPasswordChangeModalOpen, setIsPasswordChangeModalOpen] = useState(false);
  const [passwordChangeUser, setPasswordChangeUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordInForm, setShowPasswordInForm] = useState(true); // Show password by default for admin
  const [showPasswordInModal, setShowPasswordInModal] = useState(true); // Show password in change modal
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);

  const { success, error: showError } = useToast();

  // Fetch branches for branch selector
  const fetchBranches = useCallback(async () => {
    try {
      const response = await api.get("/branches", {
        params: { includeArchived: false },
      });
      const branchesData = response.data?.data || response.data || [];
      setBranches(Array.isArray(branchesData) ? branchesData : []);
    } catch (err) {
      console.error("Error fetching branches:", err);
    }
  }, []);

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
    fetchUsers();
    fetchBranches();
  }, [fetchUsers, fetchBranches]);

  // Initialize socket and listen for password change events via WebSocket
  useEffect(() => {
    // Initialize socket if not already connected
    initializeSocket();
    const socket = getSocket();
    if (!socket) return;

    const handlePasswordChanged = (data) => {
      // Update user list when password is changed
      const changedUser = users.find(u => u.id === data.userId);
      if (changedUser) {
        // Update the user in the local state with new password
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === data.userId 
              ? { 
                  ...user, 
                  plainPassword: data.newPassword || user.plainPassword,
                  passwordChangedBy: data.changedByUserId,
                  passwordChangedAt: data.timestamp,
                  passwordChangedByUserFlag: data.changedBy === "user",
                  changedByUserName: data.changedBy === "user" ? "User" : "Admin",
                  changedByRole: data.changedBy === "user" ? changedUser.role : "ADMIN",
                }
              : user
          )
        );
        
        // Show notification
        const userName = changedUser.name || "User";
        const changedBy = data.changedBy === "user" ? "the user" : "admin";
        success(`Password changed for ${userName} by ${changedBy}`);
      } else {
        // User not in current list, refresh the list
        fetchUsers();
        success("Password changed for a user. Refreshing list...");
      }
    };

    const handleUserCreated = (data) => {
      // Refresh user list when new user is created
      fetchUsers();
      success(`New user ${data.userName || ""} created`);
    };

    on("password_changed", handlePasswordChanged);
    on("user_created", handleUserCreated);

    return () => {
      off("password_changed", handlePasswordChanged);
      off("user_created", handleUserCreated);
    };
  }, [users, selectedUser, fetchUsers, success]);

  // User Management Functions
  const validateUserForm = () => {
    const errors = {};
    if (!userFormData.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!/^[0-9]{10,15}$/.test(userFormData.phone.replace(/\s+/g, ""))) {
      errors.phone = "Invalid phone number format (10-15 digits)";
    }
    // Password validation: required for new users, optional for updates but must be 6+ chars if provided
    if (!selectedUser && !userFormData.password.trim()) {
      errors.password = "Password is required";
    } else if (!selectedUser && userFormData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    } else if (selectedUser && userFormData.password.trim() && userFormData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }
    if (!userFormData.name.trim()) {
      errors.name = "Name is required";
    }
    if (!userFormData.branchId) {
      errors.branchId = "Branch is required";
    }
    if (
      userFormData.role === "DENTIST" &&
      !userFormData.specialization.trim()
    ) {
      errors.specialization = "Specialization is required for dentists";
    }
    setUserFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenUserModal = (user = null) => {
    if (user) {
      setSelectedUser(user);
      // For backward compatibility: use phone if available, otherwise use email
      const phoneValue = user.phone || user.email || "";
      setUserFormData({
        phone: phoneValue,
        password: "",
        role: user.role || "RECEPTION",
        name: user.name || "",
        branchId: user.branchId || "",
        specialization: user.specialization || "",
      });
    } else {
      setSelectedUser(null);
      setUserFormData({
        phone: "",
        password: "",
        role: selectedRole,
        name: "",
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
      phone: "",
      password: "",
      role: selectedRole,
      name: "",
      branchId: "",
      specialization: "",
    });
    setUserFormErrors({});
  };

  const handleOpenPasswordChangeModal = (user) => {
    setPasswordChangeUser(user);
    setNewPassword("");
    setConfirmPassword("");
    setIsPasswordChangeModalOpen(true);
  };

  const handleClosePasswordChangeModal = () => {
    setIsPasswordChangeModalOpen(false);
    setPasswordChangeUser(null);
    setNewPassword("");
    setConfirmPassword("");
    setPasswordChangeLoading(false);
  };

  const generateSecurePassword = () => {
    // Generate a secure password: 12 characters with mix of uppercase, lowercase, numbers
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let password = "";
    // Ensure at least one of each type
    password += "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 26)];
    password += "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)];
    password += "0123456789"[Math.floor(Math.random() * 10)];
    // Fill the rest randomly
    for (let i = 3; i < 12; i++) {
      password += chars[Math.floor(Math.random() * chars.length)];
    }
    // Shuffle the password
    password = password.split("").sort(() => Math.random() - 0.5).join("");
    return password;
  };

  const handleGeneratePassword = () => {
    const generated = generateSecurePassword();
    setNewPassword(generated);
    setConfirmPassword(generated);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (!newPassword.trim() || newPassword.trim().length < 6) {
      showError("Password must be at least 6 characters");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      showError("Passwords do not match");
      return;
    }

    setPasswordChangeLoading(true);

    try {
      const response = await api.patch(`/users/${passwordChangeUser.id}/change-password`, {
        newPassword: newPassword.trim(),
      });

      if (response.data) {
        success("Password changed successfully");
        handleClosePasswordChangeModal();
        fetchUsers(); // Refresh user list
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Failed to change password";
      showError(errorMessage);
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  const handlePasswordVerified = async (verifiedPassword) => {
    if (!pendingPasswordAction) return;

    const { action, submitData } = pendingPasswordAction;
    
    try {
      if (action === "update") {
        await api.put(`/users/${selectedUser.id}`, submitData);
        success("User updated successfully");
      } else if (action === "create") {
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
    } finally {
      setPendingPasswordAction(null);
    }
  };

  const handleUserSubmit = async (e) => {
    e.preventDefault();
    if (!validateUserForm()) return;

    const submitData = { ...userFormData };
    
    // If updating user and password is provided, require password verification
    if (selectedUser && submitData.password) {
      setPendingPasswordAction({ action: "update", submitData });
      setIsPasswordVerificationOpen(true);
      return;
    }

    // If creating new user, no password verification needed
    if (!selectedUser) {
      try {
        const response = await api.post("/users", submitData);
        // API interceptor extracts response.data.data, so response.data contains the user
        const createdUser = response.data;
        
        // Show password to admin after creation (password is in form data, but also in response.plainPassword)
        const passwordToShow = createdUser?.plainPassword || userFormData.password;
        if (passwordToShow) {
          // Copy password to clipboard automatically
          navigator.clipboard.writeText(passwordToShow);
          success(`User created successfully! Password: ${passwordToShow} (copied to clipboard)`);
        } else {
          success("User created successfully");
        }
        
        handleCloseUserModal();
        fetchUsers();
      } catch (err) {
        const errorMessage =
          err.response?.data?.message ||
          err.response?.data?._message ||
          err.response?.data?.error ||
          "Failed to save user";
        showError(errorMessage);
      }
      return;
    }

    // Update without password change - no verification needed
    try {
      if (!submitData.password) {
        delete submitData.password;
      }
      await api.put(`/users/${selectedUser.id}`, submitData);
      success("User updated successfully");
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

  const activeBranches = branches.filter((b) => b.isActive);

  // User Columns
  const userColumns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
    },
    {
      key: "phone",
      label: "Phone",
      render: (value, row) => {
        // For backward compatibility: show phone if available, otherwise email
        const phoneValue = row.phone || row.email;
        return phoneValue || "—";
      },
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
      key: "password",
      label: "Password",
      render: (value, row) => {
        const plainPassword = row.plainPassword || "—";
        const changedAt = row.passwordChangedAt;
        // Determine who changed the password based on passwordChangedByUserFlag
        const changedByUser = row.passwordChangedByUserFlag === true;
        const changedBy = changedByUser 
          ? (row.changedByUserName || "User")
          : (row.changedByUserName || "Admin");
        const createdBy = row.createdByName || "Admin";
        
        return (
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm text-gray-800">{plainPassword}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (plainPassword !== "—") {
                    navigator.clipboard.writeText(plainPassword);
                    success("Password copied to clipboard");
                  }
                }}
                className="px-2 py-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                title="Copy password"
              >
                📋
              </button>
            </div>
            {changedAt && (
              <div className="text-xs text-gray-500">
                Changed by {changedByUser ? "User" : "Admin"} on {formatDate(changedAt)}
              </div>
            )}
            {!changedAt && row.createdAt && (
              <div className="text-xs text-gray-400">
                Created by {createdBy} on {formatDate(row.createdAt)}
              </div>
            )}
          </div>
        );
      },
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
            onClick={() => handleOpenPasswordChangeModal(row)}
            className="px-3 py-1 text-sm text-white bg-orange-600 rounded hover:bg-orange-700"
          >
            Change Password
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700">
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
            <label className="block mb-2 text-sm font-medium text-gray-700">
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
              ➕ Add{" "}
              {selectedRole === "RECEPTION"
                ? "Reception"
                : selectedRole === "DENTIST"
                ? "Dentist"
                : "X-Ray"}{" "}
              User
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

      {/* User Create/Edit Modal */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={handleCloseUserModal}
        title={selectedUser ? "Edit User" : `Add New ${selectedRole} User`}
        size="medium"
      >
        <form onSubmit={handleUserSubmit} className="space-y-4">
          {/* 1. Name */}
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

          {/* 2. Phone Number */}
          <div>
            <label
              htmlFor="user-phone"
              className="block text-sm font-medium text-gray-700"
            >
              Phone Number *
            </label>
            <input
              type="tel"
              id="user-phone"
              value={userFormData.phone}
              onChange={(e) =>
                setUserFormData({ ...userFormData, phone: e.target.value })
              }
              placeholder="e.g., 0924308310"
              className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                userFormErrors.phone ? "border-red-500" : "border-gray-300"
              }`}
            />
            {userFormErrors.phone && (
              <p className="mt-1 text-sm text-red-600">
                {userFormErrors.phone}
              </p>
            )}
          </div>

          {/* 3. Branch */}
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

          {/* 4. Role */}
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
              className="block w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="RECEPTION">Reception</option>
              <option value="DENTIST">Dentist</option>
              <option value="XRAY">X-Ray</option>
            </select>
          </div>

          {/* 5. Password */}
          <div>
            <label
              htmlFor="user-password"
              className="block text-sm font-medium text-gray-700"
            >
              Password {selectedUser ? "(enter new password to change)" : "*"}
            </label>
            <div className="mt-1 relative">
              <input
                type={showPasswordInForm ? "text" : "password"}
                id="user-password"
                value={userFormData.password}
                onChange={(e) =>
                  setUserFormData({ ...userFormData, password: e.target.value })
                }
                placeholder={selectedUser ? "Enter new password to update" : "Enter password"}
                className={`block w-full px-3 py-2 pr-10 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                  userFormErrors.password ? "border-red-500" : "border-gray-300"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPasswordInForm(!showPasswordInForm)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                title={showPasswordInForm ? "Hide password" : "Show password"}
              >
                {showPasswordInForm ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            {!selectedUser && (
              <button
                type="button"
                onClick={() => {
                  const generated = generateSecurePassword();
                  setUserFormData({ ...userFormData, password: generated });
                }}
                className="mt-2 px-3 py-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded border border-indigo-200"
              >
                🔑 Generate Secure Password
              </button>
            )}
            {userFormErrors.password && (
              <p className="mt-1 text-sm text-red-600">
                {userFormErrors.password}
              </p>
            )}
            {selectedUser && !userFormErrors.password && (
              <p className="mt-1 text-xs text-gray-500">
                Leave blank to keep current password, or enter a new password to change it
              </p>
            )}
            {!selectedUser && userFormData.password && (
              <div className="mt-2 flex items-center space-x-2">
                <span className="text-xs text-gray-600">Password: <span className="font-mono">{userFormData.password}</span></span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(userFormData.password);
                    success("Password copied to clipboard");
                  }}
                  className="text-xs text-indigo-600 hover:text-indigo-800"
                  title="Copy password"
                >
                  📋 Copy
                </button>
              </div>
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

          <div className="flex justify-end pt-4 space-x-3">
            <button
              type="button"
              onClick={handleCloseUserModal}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {selectedUser ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Password Verification Modal */}
      <PasswordVerification
        isOpen={isPasswordVerificationOpen}
        onClose={() => {
          setIsPasswordVerificationOpen(false);
          setPendingPasswordAction(null);
        }}
        onVerify={handlePasswordVerified}
        title="Verify Password to Change User Password"
      />

      {/* Change Password Modal */}
      <Modal
        isOpen={isPasswordChangeModalOpen}
        onClose={handleClosePasswordChangeModal}
        title={`Change Password for ${passwordChangeUser?.name || "User"}`}
        size="medium"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
            <p className="font-semibold">Password will be visible to admin after change</p>
          </div>

          <div>
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              New Password *
            </label>
            <div className="relative">
              <input
                type={showPasswordInModal ? "text" : "password"}
                id="new-password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                }}
                placeholder="Enter new password"
                className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                required
                minLength={6}
                disabled={passwordChangeLoading}
              />
              <button
                type="button"
                onClick={() => setShowPasswordInModal(!showPasswordInModal)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                title={showPasswordInModal ? "Hide password" : "Show password"}
                disabled={passwordChangeLoading}
              >
                {showPasswordInModal ? "👁️" : "👁️‍🗨️"}
              </button>
            </div>
            <button
              type="button"
              onClick={handleGeneratePassword}
              className="mt-2 px-3 py-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded border border-indigo-200"
              disabled={passwordChangeLoading}
            >
              🔑 Generate Secure Password
            </button>
          </div>

          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Confirm Password *
            </label>
            <input
              type={showPasswordInModal ? "text" : "password"}
              id="confirm-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
              }}
              placeholder="Confirm new password"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
              minLength={6}
              disabled={passwordChangeLoading}
            />
          </div>

          {newPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
              ✓ Passwords match
            </div>
          )}

          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              ✗ Passwords do not match
            </div>
          )}

          <div className="flex justify-end pt-4 space-x-3">
            <button
              type="button"
              onClick={handleClosePasswordChangeModal}
              disabled={passwordChangeLoading}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={passwordChangeLoading || !newPassword || newPassword !== confirmPassword || newPassword.length < 6}
              className="px-4 py-2 text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {passwordChangeLoading ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagement;
