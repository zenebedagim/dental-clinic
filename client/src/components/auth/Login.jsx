import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../../services/api";
import { validatePhone } from "../../utils/phoneValidator";

const Login = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberPhone, setRememberPhone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  // Load remembered phone from localStorage
  useEffect(() => {
    const rememberedPhone = localStorage.getItem("rememberedPhone");
    if (rememberedPhone) {
      setPhone(rememberedPhone);
      setRememberPhone(true);
    }
  }, []);

  // Validate phone in real-time using phoneValidator
  useEffect(() => {
    if (phone && phone.length > 0) {
      const validation = validatePhone(phone);
      if (!validation.isValid) {
        setPhoneError(validation.error || "Invalid phone number format");
      } else {
        setPhoneError("");
      }
    } else {
      setPhoneError("");
    }
  }, [phone]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate phone using phoneValidator (handles Ethiopian format)
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.isValid) {
      setError(
        phoneValidation.error || "Invalid phone number format. Must be a valid Ethiopian phone number (e.g., 0911922363)"
      );
      return;
    }

    // Normalize phone: remove spaces, convert +251 to 0, ensure starts with 0
    let normalized = phone.replace(/\s+/g, "").replace(/^\+251/, "0");
    if (!normalized.startsWith("0")) {
      normalized = `0${normalized}`;
    }

    // Validate password (trim whitespace)
    const trimmedPassword = password.trim();
    if (!trimmedPassword || trimmedPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await login(normalized, trimmedPassword);

      if (response.token && response.user) {
        // Store token and user
        localStorage.setItem("token", response.token);
        localStorage.setItem("user", JSON.stringify(response.user));

        // Remember phone if checkbox is checked
        if (rememberPhone) {
          localStorage.setItem("rememberedPhone", normalized);
        } else {
          localStorage.removeItem("rememberedPhone");
        }

        // Dispatch tokenChanged event for socket connection
        window.dispatchEvent(new Event("tokenChanged"));

        // Redirect based on user role and passwordChanged flag
        const userRole = response.user.role;

        // Admin users: check passwordChanged flag
        if (userRole === "ADMIN") {
          if (response.user.passwordChanged === false) {
            navigate("/admin/change-password", { replace: true });
          } else {
            navigate("/admin", { replace: true });
          }
        }
        // Reception users
        else if (userRole === "RECEPTION") {
          navigate("/reception", { replace: true });
        }
        // Dentist users
        else if (userRole === "DENTIST") {
          navigate("/dentist", { replace: true });
        }
        // X-Ray users
        else if (userRole === "XRAY") {
          navigate("/xray", { replace: true });
        }
        // Fallback to admin if role not recognized
        else {
          navigate("/admin", { replace: true });
        }
      } else {
        setError("Invalid response from server");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Login failed. Please try again.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Benas specialty dental clinic
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
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

          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="phone" className="sr-only">
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  phoneError ? "border-red-300" : "border-gray-300"
                } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm`}
                placeholder="e.g., 0924308310"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={loading}
              />
              {phoneError && (
                <p className="mt-1 text-sm text-red-600">{phoneError}</p>
              )}
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
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

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-phone"
                name="remember-phone"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={rememberPhone}
                onChange={(e) => setRememberPhone(e.target.checked)}
                disabled={loading}
              />
              <label
                htmlFor="remember-phone"
                className="ml-2 block text-sm text-gray-900"
              >
                Remember phone number
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !!phoneError}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                  Logging in...
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </div>

          <div className="text-center text-xs text-gray-500">
            <p>Enter your phone number and password to login</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
