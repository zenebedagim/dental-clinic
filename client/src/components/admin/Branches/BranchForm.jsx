import { useState } from "react";
import api from "../../../services/api";

const BranchForm = ({ onBranchCreated, onCancel, initialBranch = null }) => {
  const [formData, setFormData] = useState({
    name: initialBranch?.name || "",
    code: initialBranch?.code || "",
    address: initialBranch?.address || "",
    taxNumber: initialBranch?.taxNumber || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (initialBranch) {
        // Update existing branch
        const response = await api.put(
          `/branches/${initialBranch.id}`,
          formData
        );
        const data = response.data?.data || response.data;
        setSuccess("Branch updated successfully!");
        if (onBranchCreated) {
          setTimeout(() => {
            onBranchCreated(data);
          }, 1000);
        }
      } else {
        // Create new branch
        const response = await api.post("/branches", formData);
        const data = response.data?.data || response.data;
        setSuccess("Branch created successfully!");
        setFormData({
          name: "",
          code: "",
          address: "",
          taxNumber: "",
        });
        if (onBranchCreated) {
          setTimeout(() => {
            onBranchCreated(data);
          }, 1000);
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to save branch. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">
        {initialBranch ? "Update Branch" : "Create New Branch"}
      </h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Branch Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter branch name"
          />
        </div>

        <div>
          <label
            htmlFor="code"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Branch Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="code"
            name="code"
            required
            value={formData.code}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter branch code"
          />
        </div>

        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Address <span className="text-red-500">*</span>
          </label>
          <textarea
            id="address"
            name="address"
            required
            value={formData.address}
            onChange={handleChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter branch address"
          />
        </div>

        <div>
          <label
            htmlFor="taxNumber"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Tax Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="taxNumber"
            name="taxNumber"
            required
            value={formData.taxNumber}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter tax number"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Saving..."
              : initialBranch
              ? "Update Branch"
              : "Create Branch"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BranchForm;

