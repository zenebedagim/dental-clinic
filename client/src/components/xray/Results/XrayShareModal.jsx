import { useState, useEffect } from "react";
import api from "../../../services/api";
import Modal from "../../common/Modal";
import { useToast } from "../../../hooks/useToast";

const XrayShareModal = ({ isOpen, onClose, xrayId, onShareCreated }) => {
  const { success: showSuccess, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingShares, setLoadingShares] = useState(false);
  const [shares, setShares] = useState([]);
  const [formData, setFormData] = useState({
    password: "",
    expiresAt: "",
    maxViews: "",
  });
  const [copySuccess, setCopySuccess] = useState("");

  useEffect(() => {
    if (isOpen && xrayId) {
      fetchShares();
      setFormData({ password: "", expiresAt: "", maxViews: "" });
      setCopySuccess("");
    }
  }, [isOpen, xrayId]);

  const fetchShares = async () => {
    try {
      setLoadingShares(true);
      const response = await api.get(`/xray/${xrayId}/shares`);
      const sharesData = response.data?.data || response.data || [];
      setShares(sharesData.filter((share) => share.isActive));
    } catch (err) {
      console.error("Error fetching shares:", err);
    } finally {
      setLoadingShares(false);
    }
  };

  const handleCreateShare = async (e) => {
    e.preventDefault();
    setLoading(true);
    setCopySuccess("");

    try {
      const submitData = {
        ...(formData.password && { password: formData.password }),
        ...(formData.expiresAt && { expiresAt: formData.expiresAt }),
        ...(formData.maxViews && { maxViews: parseInt(formData.maxViews) }),
      };

      const response = await api.post(`/xray/${xrayId}/share`, submitData);
      const shareData = response.data?.data || response.data;
      
      showSuccess("Share link created successfully!");
      if (onShareCreated) {
        onShareCreated();
      }
      fetchShares();
      setFormData({ password: "", expiresAt: "", maxViews: "" });
      
      // Auto-copy share URL to clipboard
      if (shareData.shareUrl) {
        navigator.clipboard.writeText(shareData.shareUrl);
        setCopySuccess("Share link copied to clipboard!");
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to create share link");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeShare = async (shareId) => {
    if (!window.confirm("Are you sure you want to revoke this share link?")) {
      return;
    }

    try {
      await api.delete(`/xray/share/${shareId}`);
      showSuccess("Share link revoked successfully");
      fetchShares();
      if (onShareCreated) {
        onShareCreated();
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to revoke share link");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopySuccess("Copied to clipboard!");
    setTimeout(() => setCopySuccess(""), 2000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share X-Ray" size="large">
      <div className="p-6 space-y-6">
        {/* Create New Share */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-lg font-semibold mb-4">Create New Share Link</h3>
          <form onSubmit={handleCreateShare} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password (Optional)
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Leave blank for no password"
                  minLength={4}
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expires At (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) =>
                    setFormData({ ...formData, expiresAt: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Views (Optional)
                </label>
                <input
                  type="number"
                  value={formData.maxViews}
                  onChange={(e) =>
                    setFormData({ ...formData, maxViews: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., 10"
                  min={1}
                  max={1000}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Share Link"}
            </button>
          </form>

          {copySuccess && (
            <div className="mt-2 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded text-sm">
              {copySuccess}
            </div>
          )}
        </div>

        {/* Existing Shares */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Active Share Links</h3>
          {loadingShares ? (
            <div className="text-center py-4 text-gray-500">Loading shares...</div>
          ) : shares.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No active share links. Create one above.
            </div>
          ) : (
            <div className="space-y-3">
              {shares.map((share) => (
                <div
                  key={share.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <input
                          type="text"
                          value={share.shareUrl}
                          readOnly
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm font-mono"
                          onClick={(e) => e.target.select()}
                        />
                        <button
                          onClick={() => copyToClipboard(share.shareUrl)}
                          className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                          title="Copy link"
                        >
                          Copy
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Password:</span>{" "}
                          {share.password ? "✓ Set" : "None"}
                        </div>
                        <div>
                          <span className="font-medium">Expires:</span>{" "}
                          {formatDate(share.expiresAt)}
                        </div>
                        <div>
                          <span className="font-medium">Views:</span> {share.viewCount}
                          {share.maxViews ? ` / ${share.maxViews}` : ""}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span>{" "}
                          {new Date(share.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeShare(share.id)}
                      className="ml-4 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                      title="Revoke share link"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Share links allow external users to view X-Ray images
            without logging in. Use passwords and expiration dates for security.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default XrayShareModal;

