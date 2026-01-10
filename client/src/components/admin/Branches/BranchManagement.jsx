import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";
import { useToast } from "../../../hooks/useToast";
import DataTable from "../../common/DataTable";
import Modal from "../../common/Modal";
import ConfirmDialog from "../../common/ConfirmDialog";
import Loader from "../../common/Loader";

const BranchManagement = () => {
  const [branches, setBranches] = useState([]);
  const [branchLoading, setBranchLoading] = useState(true);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
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

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

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
          {!row.isActive && (
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

  if (branchLoading) {
    return <Loader />;
  }

  return (
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
              <p className="mt-1 text-sm text-red-600">
                {branchFormErrors.name}
              </p>
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
              <p className="mt-1 text-sm text-red-600">
                {branchFormErrors.code}
              </p>
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
                branchFormErrors.taxNumber
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
            />
            {branchFormErrors.taxNumber && (
              <p className="mt-1 text-sm text-red-600">
                {branchFormErrors.taxNumber}
              </p>
            )}
          </div>

          <div className="flex justify-end pt-4 space-x-3">
            <button
              type="button"
              onClick={handleCloseBranchModal}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {selectedBranch ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </Modal>

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
    </div>
  );
};

export default BranchManagement;
