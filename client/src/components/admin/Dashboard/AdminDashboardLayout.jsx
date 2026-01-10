import { useState, useEffect, useCallback } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import Navbar from "../../common/Navbar";
import AdminSidebar from "../Shared/AdminSidebar";
import PasswordReauthModal from "../PasswordReauthModal";
import useSessionTimeout from "../../../hooks/useSessionTimeout";
import usePageVisibility from "../../../hooks/usePageVisibility";

const AdminDashboardLayout = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);

  const navigate = useNavigate();

  // Session timeout: 30 minutes of inactivity - logout after timeout
  useSessionTimeout(30, true);

  // Page visibility hook to detect when user returns
  const { isVisible, wasAway, resetWasAway } = usePageVisibility();

  // Verify admin phone number and passwordChanged flag on mount
  useEffect(() => {
    const adminPhone = "0911922363";
    const userPhone = user.phone || user.email || "";

    // Normalize phone numbers (remove spaces)
    const normalizedUserPhone = userPhone.replace(/\s+/g, "");
    const normalizedAdminPhone = adminPhone.replace(/\s+/g, "");

    // Check if user is admin and has the correct phone number
    if (user.role === "ADMIN" && normalizedUserPhone !== normalizedAdminPhone) {
      console.warn("Unauthorized admin access attempt. Redirecting to login.");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("selectedBranch");
      navigate("/login", { replace: true });
      return;
    }

    // Check if password needs to be changed (first login)
    // Only redirect if not already on change-password route
    if (
      user.role === "ADMIN" &&
      user.passwordChanged === false &&
      window.location.pathname !== "/admin/change-password"
    ) {
      console.warn("Password change required. Redirecting to change-password.");
      navigate("/admin/change-password", { replace: true });
      return;
    }

    // If passwordChanged is true but user tries to access change-password, redirect to dashboard
    if (
      user.role === "ADMIN" &&
      user.passwordChanged === true &&
      window.location.pathname === "/admin/change-password"
    ) {
      navigate("/admin", { replace: true });
    }
  }, [user, navigate]);

  // Handle page visibility change - show re-auth modal when user returns
  useEffect(() => {
    // Only show re-auth if:
    // 1. User is visible (returned to page)
    // 2. User was away
    // 3. Password is already changed (not on first login)
    // 4. Modal is not already showing
    // 5. Not already on change-password route
    // 6. Check if re-auth was done recently (within last 5 minutes)
    if (
      isVisible &&
      wasAway &&
      user.role === "ADMIN" &&
      user.passwordChanged === true &&
      !showReauthModal &&
      window.location.pathname !== "/admin/change-password"
    ) {
      // Check recent re-auth timestamp
      const reauthTimestamp = localStorage.getItem("reauthTimestamp");
      if (reauthTimestamp) {
        const timeSinceReauth = Date.now() - parseInt(reauthTimestamp, 10);
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

        if (timeSinceReauth < fiveMinutes) {
          // Recently re-authenticated, don't show again
          resetWasAway();
          return;
        }
      }

      // Use setTimeout to avoid synchronous setState in effect
      const timer = setTimeout(() => {
        setShowReauthModal(true);
      }, 0);

      return () => clearTimeout(timer);
    }
  }, [isVisible, wasAway, user, showReauthModal, resetWasAway]);

  // Handle successful re-authentication
  const handleReauthSuccess = useCallback(() => {
    setShowReauthModal(false);
    resetWasAway();
    // Store re-auth timestamp
    localStorage.setItem("reauthTimestamp", Date.now().toString());
  }, [resetWasAway]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar */}
      <Navbar user={user} />

      {/* Main Layout: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation */}
        <div
          className={`fixed lg:static inset-y-0 left-0 z-50 transform ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0 transition-transform duration-300 ease-in-out`}
        >
          <AdminSidebar onClose={() => setSidebarOpen(false)} />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto w-full lg:w-auto">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden fixed top-20 left-4 z-30 bg-indigo-600 text-white p-2 rounded-md shadow-lg"
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
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Password Re-authentication Modal */}
      <PasswordReauthModal
        isOpen={showReauthModal}
        onClose={handleReauthSuccess}
      />
    </div>
  );
};

export default AdminDashboardLayout;
