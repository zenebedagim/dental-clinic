import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        // Only redirect if user data is valid and has a role
        if (user && user.role) {
        // Admin users redirect to admin dashboard (no branch selection needed)
        if (user.role === "ADMIN") {
          navigate("/admin", { replace: true });
          return;
        }
        
        const roleRoutes = {
          RECEPTION: "/reception",
          DENTIST: "/dentist",
          XRAY: "/xray",
          ADMIN: "/admin",
        };
        const redirectPath = roleRoutes[user.role];
        if (redirectPath) {
          // Ensure branch is stored (not needed for admin)
          if (user.branch && user.role !== "ADMIN") {
            localStorage.setItem("selectedBranch", JSON.stringify(user.branch));
          }
          navigate(redirectPath, { replace: true });
          return;
        }
        }
        // If user data is invalid or role doesn't exist, clear it
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } catch {
        // Invalid user data, clear it
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", { email, password });
      // Handle standard response format or direct response
      const data = response.data?.data || response.data;
      const { token, user } = data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Store branch from user object automatically (not needed for admin)
      if (user.branch && user.role !== "ADMIN") {
        localStorage.setItem("selectedBranch", JSON.stringify(user.branch));
      }

      // Redirect directly to role dashboard (branch is auto-assigned from user account)
      const roleRoutes = {
        RECEPTION: "/reception",
        DENTIST: "/dentist",
        XRAY: "/xray",
        ADMIN: "/admin",
      };
      const redirectPath = roleRoutes[user.role];
      if (redirectPath) {
        navigate(redirectPath, { replace: true });
      } else {
        // Invalid role, clear and redirect to login
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("selectedBranch");
        setError("Invalid user role. Please contact administrator.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?._message ||
          "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Benas Specialiality Dental Clinc Management
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </div>
        </form>

        {/* Test Credentials Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-3">
            🧪 Test Credentials (Development Only)
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between bg-white p-2 rounded border border-blue-100">
              <div className="flex-1">
                <div className="font-medium text-gray-700">Admin</div>
                <div className="text-gray-600">
                  admin@clinic.com / admin123
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail("admin@clinic.com");
                  setPassword("admin123");
                }}
                className="ml-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Use
              </button>
            </div>
            <div className="flex items-center justify-between bg-white p-2 rounded border border-blue-100">
              <div className="flex-1">
                <div className="font-medium text-gray-700">Reception</div>
                <div className="text-gray-600">
                  reception@clinic.com / reception123
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail("reception@clinic.com");
                  setPassword("reception123");
                }}
                className="ml-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Use
              </button>
            </div>
            <div className="flex items-center justify-between bg-white p-2 rounded border border-blue-100">
              <div className="flex-1">
                <div className="font-medium text-gray-700">Dentist</div>
                <div className="text-gray-600">
                  dentist@clinic.com / dentist123
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail("dentist@clinic.com");
                  setPassword("dentist123");
                }}
                className="ml-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Use
              </button>
            </div>
            <div className="flex items-center justify-between bg-white p-2 rounded border border-blue-100">
              <div className="flex-1">
                <div className="font-medium text-gray-700">X-Ray Doctor</div>
                <div className="text-gray-600">xray@clinic.com / xray123</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmail("xray@clinic.com");
                  setPassword("xray123");
                }}
                className="ml-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Use
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
