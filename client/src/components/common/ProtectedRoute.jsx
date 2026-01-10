import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, role }) => {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");

  // No token means not authenticated
  if (!token || !userStr) {
    return null; // No redirect, component won't render
  }

  // Parse user data
  let user = null;
  try {
    user = JSON.parse(userStr);
  } catch {
    // Invalid user data, clear it
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return null; // No redirect, component won't render
  }

  // If user data is invalid or missing role
  if (!user || !user.role) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return null; // No redirect, component won't render
  }

  // If role is specified and user's role doesn't match, redirect to their dashboard
  if (role && user.role !== role) {
    const roleRoutes = {
      RECEPTION: "/reception",
      DENTIST: "/dentist",
      XRAY: "/xray",
      ADMIN: "/admin",
    };
    const redirectPath = roleRoutes[user.role];
    if (redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }
  }

  // For ADMIN routes, verify phone number is exactly 0911922363 (admin-only restriction)
  if (role === "ADMIN" && user.role === "ADMIN") {
    const adminPhone = "0911922363";
    const userPhone = user.phone || user.email || "";

    // Normalize phone numbers (remove spaces)
    const normalizedUserPhone = userPhone.replace(/\s+/g, "");
    const normalizedAdminPhone = adminPhone.replace(/\s+/g, "");

    // Check if phone matches admin phone (admin-only restriction)
    if (normalizedUserPhone !== normalizedAdminPhone) {
      console.warn(
        "Unauthorized admin access attempt. Phone number does not match."
      );
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("selectedBranch");
      return <Navigate to="/login" replace />;
    }

    // Check passwordChanged flag - if false, only allow access to change-password route
    // Check current pathname from window.location to avoid React Router dependency
    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : "";

    if (user.passwordChanged === false) {
      // If not already on change-password route, redirect there
      if (currentPath !== "/admin/change-password") {
        return <Navigate to="/admin/change-password" replace />;
      }
      // If already on change-password route, allow access
      return children;
    }

    // If passwordChanged is true but user tries to access change-password, redirect to dashboard
    if (
      user.passwordChanged === true &&
      currentPath === "/admin/change-password"
    ) {
      return <Navigate to="/admin" replace />;
    }
  }
  
  // For non-admin roles, ensure they're not trying to access admin routes
  if (role === "ADMIN" && user.role !== "ADMIN") {
    // Non-admin user trying to access admin route - redirect to their dashboard
    const roleRoutes = {
      RECEPTION: "/reception",
      DENTIST: "/dentist",
      XRAY: "/xray",
    };
    const redirectPath = roleRoutes[user.role];
    if (redirectPath) {
      return <Navigate to={redirectPath} replace />;
    }
  }

  // For dashboard routes (with role), check if branch is selected
  // ADMIN users don't need branch selection
  // Branch should be set from user object during login, but if missing, use user.branch
  if (role && role !== "ADMIN") {
    let selectedBranch = localStorage.getItem("selectedBranch");
    if (!selectedBranch && user.branch) {
      // Set branch from user object if not already set
      localStorage.setItem("selectedBranch", JSON.stringify(user.branch));
      selectedBranch = JSON.stringify(user.branch);
    }
    // Only redirect if branch is truly missing (shouldn't happen after login)
    if (!selectedBranch && !user.branch) {
      console.warn("Branch not found for user");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return null; // No redirect, component won't render
    }
  }

  return children;
};

export default ProtectedRoute;
