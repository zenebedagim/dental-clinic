import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children, role }) => {
  const token = localStorage.getItem("token");
  const userStr = localStorage.getItem("user");

  // No token means not authenticated
  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  // Parse user data
  let user = null;
  try {
    user = JSON.parse(userStr);
  } catch {
    // Invalid user data, clear it and redirect to login
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
  }

  // If user data is invalid or missing role
  if (!user || !user.role) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    return <Navigate to="/login" replace />;
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
      console.warn("Branch not found for user, redirecting to login");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return <Navigate to="/login" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
