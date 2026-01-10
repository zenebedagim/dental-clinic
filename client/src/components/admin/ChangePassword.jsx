import { useState, useEffect } from "react";
import api from "../../services/api";

// Simple password strength checker
const getPasswordStrength = (password) => {
  if (!password)
    return { strength: "none", score: 0, label: "", color: "gray" };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

  let strength = "weak";
  let label = "Weak";
  let color = "red";

  if (score < 4) {
    strength = "weak";
    label = "Weak";
    color = "red";
  } else if (score < 6) {
    strength = "medium";
    label = "Medium";
    color = "yellow";
  } else {
    strength = "strong";
    label = "Strong";
    color = "green";
  }

  return { strength, score, label, color };
};

const ChangePassword = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    strength: "none",
    score: 0,
    label: "",
    color: "gray",
  });

  // Check password strength in real-time
  useEffect(() => {
    if (formData.newPassword) {
      const strength = getPasswordStrength(formData.newPassword);
      setPasswordStrength(strength);
    } else {
      setPasswordStrength({
        strength: "none",
        score: 0,
        label: "",
        color: "gray",
      });
    }
  }, [formData.newPassword]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear errors when user starts typing
    if (error) setError("");
    if (success) setSuccess("");
  };

  const validateForm = () => {
    if (!formData.currentPassword) {
      setError("Current password is required");
      return false;
    }

    if (!formData.newPassword) {
      setError("New password is required");
      return false;
    }

    if (formData.newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      return false;
    }

    // Recommend stronger password (optional warning, not error)
    if (passwordStrength.strength === "weak" && passwordStrength.score < 4) {
      // Still allow weak passwords but recommend stronger
      console.warn(
        "Password strength is weak. Consider using a stronger password."
      );
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError("New passwords do not match");
      return false;
    }

    if (formData.currentPassword === formData.newPassword) {
      setError("New password must be different from current password");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/auth/change-password", {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword,
      });

      // Update user object in localStorage with response from server (if user object returned)
      // Otherwise, manually update passwordChanged flag
      // The interceptor extracts response.data.data, so response.data should contain the user object
      if (response.data && response.data.id) {
        // Server returned updated user object - use it
        const updatedUser = {
          ...response.data,
          phone: response.data.phone || response.data.email,
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
      } else {
        // Fallback: manually update passwordChanged flag
        const userStr = localStorage.getItem("user");
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            user.passwordChanged = true;
            localStorage.setItem("user", JSON.stringify(user));
          } catch (err) {
            console.error("Error updating user in localStorage:", err);
          }
        }
      }

      setSuccess("Password changed successfully!");
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setSuccess("");
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?._message ||
          "Failed to change password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setError("");
    setSuccess("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md mx-4 bg-white rounded-lg shadow-xl">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Change Password</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 transition-colors hover:text-gray-600"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4">
          {error && (
            <div className="px-4 py-3 mb-4 text-red-700 bg-red-100 border border-red-400 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="px-4 py-3 mb-4 text-green-700 bg-green-100 border border-green-400 rounded">
              {success}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="currentPassword"
                className="block mb-1 text-sm font-medium text-gray-700"
              >
                Current Password *
              </label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Enter current password"
                value={formData.currentPassword}
                onChange={handleChange}
              />
            </div>

            <div>
              <label
                htmlFor="newPassword"
                className="block mb-1 text-sm font-medium text-gray-700"
              >
                New Password *
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  className="w-full px-3 py-2 pr-10 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter new password (min. 6 characters)"
                  value={formData.newPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
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

              {/* Password Strength Meter */}
              {formData.newPassword && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-700">
                      Password Strength:{" "}
                      <span
                        className={`font-bold ${
                          passwordStrength.color === "red"
                            ? "text-red-600"
                            : passwordStrength.color === "yellow"
                            ? "text-yellow-600"
                            : "text-green-600"
                        }`}
                      >
                        {passwordStrength.label}
                      </span>
                    </span>
                    <span className="text-xs text-gray-500">
                      {passwordStrength.score}/6
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        passwordStrength.color === "red"
                          ? "bg-red-500"
                          : passwordStrength.color === "yellow"
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }`}
                      style={{
                        width: `${(passwordStrength.score / 6) * 100}%`,
                      }}
                    ></div>
                  </div>
                  {passwordStrength.strength === "weak" && (
                    <p className="mt-1 text-xs text-yellow-600">
                      Consider using a stronger password with uppercase,
                      lowercase, numbers, and special characters
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block mb-1 text-sm font-medium text-gray-700"
              >
                Confirm New Password *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="w-full px-3 py-2 text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="flex mt-6 space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
