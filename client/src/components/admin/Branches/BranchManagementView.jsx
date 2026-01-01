import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";
import BranchForm from "./BranchForm";
import ConfirmDialog from "../../common/ConfirmDialog";

const BranchManagementView = () => {
  const [branches, setBranches] = useState([]);
  const [filteredBranches, setFilteredBranches] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveDialog, setArchiveDialog] = useState({
    isOpen: false,
    branch: null,
  });
  const [restoreDialog, setRestoreDialog] = useState({
    isOpen: false,
    branch: null,
  });

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/branches", {
        params: { includeArchived: showArchived },
      });
      const data = response.data?.data || response.data || [];
      setBranches(Array.isArray(data) ? data : []);
      setFilteredBranches(Array.isArray(data) ? data : []);
      setError("");
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        "Failed to load branches. Please try again.";
      setError(errorMsg);
      console.error("Error fetching branches:", err);
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredBranches(branches);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = branches.filter(
        (branch) =>
          branch.name.toLowerCase().includes(query) ||
          branch.code.toLowerCase().includes(query) ||
          branch.address.toLowerCase().includes(query)
      );
      setFilteredBranches(filtered);
    }
  }, [searchQuery, branches]);

  const handleArchive = async () => {
    if (!archiveDialog.branch) return;

    try {
      await api.patch(`/branches/${archiveDialog.branch.id}/archive`);
      setArchiveDialog({ isOpen: false, branch: null });
      fetchBranches();
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to archive branch";
      setError(errorMsg);
      console.error("Error archiving branch:", err);
    }
  };

  const handleRestore = async () => {
    if (!restoreDialog.branch) return;

    try {
      await api.patch(`/branches/${restoreDialog.branch.id}/restore`);
      setRestoreDialog({ isOpen: false, branch: null });
      fetchBranches();
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to restore branch";
      setError(errorMsg);
      console.error("Error restoring branch:", err);
    }
  };

  const handleFormSuccess = () => {
    setShowAddForm(false);
    setEditingBranch(null);
    fetchBranches();
  };

  const handleEdit = (branch) => {
    setEditingBranch(branch);
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingBranch(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Branch Management</h1>
        <button
          onClick={() => {
            setEditingBranch(null);
            setShowAddForm(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium"
        >
          + Add New Branch
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {showAddForm && (
        <BranchForm
          initialBranch={editingBranch}
          onBranchCreated={handleFormSuccess}
          onCancel={handleCancel}
        />
      )}

      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search branches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <label className="flex items-center space-x-2 ml-4">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Show Archived</span>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-500">
            Loading branches...
          </div>
        ) : filteredBranches.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No branches found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branch Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tax Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredBranches.map((branch) => (
                  <tr key={branch.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {branch.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {branch.code}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {branch.address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {branch.taxNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {branch.isActive ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {branch.isActive ? (
                          <>
                            <button
                              onClick={() => handleEdit(branch)}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                setArchiveDialog({ isOpen: true, branch })
                              }
                              className="text-red-600 hover:text-red-900"
                            >
                              Archive
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() =>
                              setRestoreDialog({ isOpen: true, branch })
                            }
                            className="text-green-600 hover:text-green-900"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={archiveDialog.isOpen}
        onClose={() => setArchiveDialog({ isOpen: false, branch: null })}
        onConfirm={handleArchive}
        title="Archive Branch"
        message={`Are you sure you want to archive "${archiveDialog.branch?.name}"? This will hide it from regular users.`}
        confirmText="Archive"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={restoreDialog.isOpen}
        onClose={() => setRestoreDialog({ isOpen: false, branch: null })}
        onConfirm={handleRestore}
        title="Restore Branch"
        message={`Are you sure you want to restore "${restoreDialog.branch?.name}"?`}
        confirmText="Restore"
        cancelText="Cancel"
        variant="info"
      />
    </div>
  );
};

export default BranchManagementView;
