import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const PasswordReauthModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exitMode, setExitMode] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setError("");
      setExitMode(false);
      setLoading(false);
    }
  }, [isOpen]);

  // Prevent closing modal with ESC key
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
        }
      };

      document.addEventListener("keydown", handleEscape);

      return () => {
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isOpen]);

  const handleContinue = async (e) => {
    e?.preventDefault();
    setError("");

    if (!password) {
      setError("Password is required");
      return;
    }

    setLoading(true);
    setExitMode(false);

    try {
      const response = await api.post("/auth/verify-password", {
        password,
      });

      if (response.data && response.data.verified) {
        // Store re-auth timestamp in localStorage (valid for 5 minutes)
        localStorage.setItem("reauthTimestamp", Date.now().toString());

        // Close modal and allow access
        onClose();
        setPassword("");
        setError("");
      } else {
        setError("Incorrect password. Please try again.");
        setPassword("");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?._message ||
        "Password verification failed. Please try again.";
      setError(errorMessage);
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  const handleExit = async (e) => {
    e?.preventDefault();
    setError("");

    if (!password) {
      setError("Please enter password to exit");
      return;
    }

    setLoading(true);
    setExitMode(true);

    try {
      const response = await api.post("/auth/verify-password", {
        password,
      });

      if (response.data && response.data.verified) {
        // Password verified - logout and redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("selectedBranch");
        localStorage.removeItem("reauthTimestamp");

        // Dispatch tokenChanged event for socket disconnection
        window.dispatchEvent(new Event("tokenChanged"));

        // Redirect to login
        navigate("/login", { replace: true });
      } else {
        setError("Incorrect password. Cannot exit without verification.");
        setPassword("");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?._message ||
        "Password verification failed. Cannot exit without verification.";
      setError(errorMessage);
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) {
      // Don't submit on Enter - user must click button
      e.preventDefault();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Re-authentication Required
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Please enter your password to continue accessing the admin
            dashboard.
          </p>
        </div>

        <form onSubmit={handleContinue} className="px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-red-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{error}</h3>
                </div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="reauth-password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="reauth-password"
                name="reauth-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="w-full px-3 py-2 pr-10 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                onKeyPress={handleKeyPress}
                disabled={loading}
                autoFocus
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleExit}
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && exitMode ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                "Exit"
              )}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && !exitMode ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Verifying...
                </span>
              ) : (
                "Continue"
              )}
            </button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> You cannot close this modal without
              completing one action. Click "Continue" to stay on the admin page,
              or "Exit" to logout and return to login.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordReauthModal;
