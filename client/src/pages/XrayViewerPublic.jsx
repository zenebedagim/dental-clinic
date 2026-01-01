import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";
import XrayImageViewer from "../components/common/XrayImageViewer";

const XrayViewerPublic = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [xrayData, setXrayData] = useState(null);
  const [shareInfo, setShareInfo] = useState(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [requiresPassword, setRequiresPassword] = useState(false);

  useEffect(() => {
    if (token) {
      fetchSharedXray();
    }
  }, [token]);

  const fetchSharedXray = async () => {
    try {
      setLoading(true);
      setError("");
      setPasswordError("");

      const response = await api.post(`/xray/share/${token}`, {
        ...(password && { password }),
      });

      const data = response.data?.data || response.data;
      setXrayData(data.xray);
      setShareInfo(data.shareInfo);
      setRequiresPassword(false);
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.error?.requiresPassword) {
        setRequiresPassword(true);
        setError("");
      } else {
        setError(errorData?.message || "Failed to load X-Ray");
        setRequiresPassword(false);
      }

      if (errorData?.message?.includes("password")) {
        setPasswordError(errorData.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password.trim()) {
      fetchSharedXray();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading X-Ray...</p>
        </div>
      </div>
    );
  }

  if (error && !requiresPassword) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-red-600 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            This share link may have expired, been revoked, or reached its
            maximum views.
          </p>
        </div>
      </div>
    );
  }

  if (requiresPassword) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Password Required
          </h2>
          <p className="text-gray-600 mb-4">
            This X-Ray is password protected. Please enter the password to view.
          </p>

          {passwordError && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {passwordError}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError("");
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter password"
                required
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
            >
              View X-Ray
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (!xrayData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-gray-600">No X-Ray data available</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Shared X-Ray Results
              </h1>
              <p className="text-gray-600 mt-1">
                Patient:{" "}
                <strong>{xrayData.appointment?.patientName || "N/A"}</strong>
              </p>
              {xrayData.appointment?.date && (
                <p className="text-sm text-gray-500 mt-1">
                  Date:{" "}
                  {new Date(xrayData.appointment.date).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-right">
              {shareInfo && (
                <div className="text-sm text-gray-600">
                  {shareInfo.maxViews && (
                    <p>
                      Views: {shareInfo.viewCount}
                      {shareInfo.maxViews ? ` / ${shareInfo.maxViews}` : ""}
                    </p>
                  )}
                  {shareInfo.expiresAt && (
                    <p>
                      Expires:{" "}
                      {new Date(shareInfo.expiresAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* X-Ray Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">X-Ray Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {xrayData.xrayType && (
              <div>
                <span className="text-sm font-medium text-gray-700">Type:</span>{" "}
                <span className="text-gray-900">{xrayData.xrayType}</span>
              </div>
            )}
            {xrayData.technique && (
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Technique:
                </span>{" "}
                <span className="text-gray-900">{xrayData.technique}</span>
              </div>
            )}
            {xrayData.urgency && (
              <div>
                <span className="text-sm font-medium text-gray-700">
                  Urgency:
                </span>{" "}
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    xrayData.urgency === "URGENT"
                      ? "bg-red-100 text-red-800"
                      : xrayData.urgency === "HIGH"
                      ? "bg-orange-100 text-orange-800"
                      : xrayData.urgency === "MEDIUM"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {xrayData.urgency}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* X-Ray Images */}
        {xrayData.id && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">X-Ray Images</h2>
            <XrayImageViewer xrayId={xrayData.id} canDelete={false} />
          </div>
        )}

        {/* Findings */}
        {xrayData.result && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">
              Radiographic Findings
            </h2>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">
                {xrayData.result}
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>
            This is a shared X-Ray link. Only view if you have permission from
            the patient.
          </p>
        </div>
      </div>
    </div>
  );
};

export default XrayViewerPublic;
