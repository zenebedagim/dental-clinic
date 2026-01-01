import { useMemo } from "react";

/**
 * Custom hook to check role-based access permissions
 * Returns functions to check if current user has specific permissions
 */
const useRoleAccess = () => {
  const userRole = useMemo(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return user?.role || null;
      }
    } catch (err) {
      console.error("Error getting user role:", err);
    }
    return null;
  }, []);

  /**
   * Check if user can access X-Ray data (images, results, etc.)
   * Allowed: DENTIST, XRAY
   * Not allowed: RECEPTION
   */
  const canAccessXrayData = () => {
    return userRole === "DENTIST" || userRole === "XRAY";
  };

  /**
   * Check if user can create X-Ray requests
   * Allowed: DENTIST only
   */
  const canCreateXrayRequest = () => {
    return userRole === "DENTIST";
  };

  /**
   * Check if user can view X-Ray images
   * Allowed: DENTIST, XRAY
   */
  const canViewXrayImages = () => {
    return userRole === "DENTIST" || userRole === "XRAY";
  };

  /**
   * Check if user can upload X-Ray results
   * Allowed: XRAY only
   */
  const canUploadXrayResults = () => {
    return userRole === "XRAY";
  };

  /**
   * Check if user can send X-Ray results to dentist
   * Allowed: XRAY only
   */
  const canSendXrayToDentist = () => {
    return userRole === "XRAY";
  };

  /**
   * Check if user can message another role
   * Reception → Dentist: YES
   * Dentist → Reception: YES
   * Dentist → X-Ray Doctor: YES
   * X-Ray Doctor → Dentist: YES
   * Reception → X-Ray Doctor: NO
   * X-Ray Doctor → Reception: NO
   */
  const canMessageRole = (targetRole) => {
    if (userRole === "RECEPTION" && targetRole === "DENTIST") return true;
    if (userRole === "DENTIST" && targetRole === "RECEPTION") return true;
    if (userRole === "DENTIST" && targetRole === "XRAY") return true;
    if (userRole === "XRAY" && targetRole === "DENTIST") return true;
    return false;
  };

  /**
   * Get current user role
   */
  const getCurrentRole = () => {
    return userRole;
  };

  /**
   * Check if current user is a specific role
   */
  const isRole = (role) => {
    return userRole === role;
  };

  /**
   * Check if user can view detailed billing section
   * Allowed: DENTIST always, RECEPTION only when showDetailedBilling is true
   */
  const canViewDetailedBilling = (payment) => {
    if (userRole === "DENTIST") {
      return true; // Dentists always see detailed billing
    }
    if (userRole === "RECEPTION") {
      return payment?.showDetailedBilling === true;
    }
    return false;
  };

  return {
    userRole,
    canAccessXrayData,
    canCreateXrayRequest,
    canViewXrayImages,
    canUploadXrayResults,
    canSendXrayToDentist,
    canMessageRole,
    getCurrentRole,
    isRole,
    canViewDetailedBilling,
  };
};

export default useRoleAccess;
