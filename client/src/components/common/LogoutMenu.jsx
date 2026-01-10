import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const LogoutMenu = ({ onClose }) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);
  const passwordInputRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        if (!showLogoutModal) {
          setShowMenu(false);
          onClose();
        }
      }
    };

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showMenu, showLogoutModal, onClose]);

  // Focus password input when logout modal opens
  useEffect(() => {
    if (showLogoutModal && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [showLogoutModal]);

  const handleLogoutClick = () => {
    // Open password verification modal for logout
    setShowMenu(false);
    setShowLogoutModal(true);
    setError("");
    setPassword("");
  };

  const handleExit = () => {
    // Simple exit without password verification - redirect to login
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedBranch");
    localStorage.removeItem("reauthTimestamp");
    window.dispatchEvent(new Event("tokenChanged"));
    navigate("/login", { replace: true });
  };

  const handleLogout = async (e) => {
    e?.preventDefault();
    setError("");

    if (!password.trim()) {
      setError("Please enter password to logout");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/verify-password", {
        password: password.trim(),
      });

      if (response.data && response.data.verified) {
        // Password verified - logout and redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("selectedBranch");
        localStorage.removeItem("reauthTimestamp");
        window.dispatchEvent(new Event("tokenChanged"));
        navigate("/login", { replace: true });
      } else {
        setError("Incorrect password. Cannot logout without verification.");
        setPassword("");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?._message ||
        "Password verification failed. Cannot logout without verification.";
      setError(errorMessage);
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
    setPassword("");
    setError("");
    setShowMenu(true);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) {
      handleLogout(e);
    } else if (e.key === "Escape") {
      handleCancelLogout();
    }
  };

  if (showLogoutModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Logout Confirmation
          </h2>
          <p className="text-gray-600 mb-4">
            Please enter your password to logout.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label
              htmlFor="logout-password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Password
            </label>
            <input
              ref={passwordInputRef}
              id="logout-password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              onKeyDown={handleKeyPress}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your password"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleCancelLogout}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading || !password.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Verifying..." : "Logout"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!showMenu) return null;

  return (
    <div
      ref={menuRef}
      className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200"
    >
      <div className="py-1">
        <button
          onClick={handleLogoutClick}
          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
        >
          Logout
        </button>
        <button
          onClick={handleExit}
          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 focus:outline-none focus:bg-red-50"
        >
          Exit
        </button>
      </div>
    </div>
  );
};

export default LogoutMenu;
