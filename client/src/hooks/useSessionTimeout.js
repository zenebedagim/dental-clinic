import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Custom hook to handle session timeout and inactivity detection
 * @param {number} timeoutMinutes - Minutes of inactivity before timeout (default: 30)
 * @param {boolean} enabled - Whether to enable session timeout
 */
const useSessionTimeout = (timeoutMinutes = 30, enabled = true) => {
  const navigate = useNavigate();
  const timeoutRef = useRef(null);
  // Initialize with current timestamp (using lazy initialization)
  const lastActivityRef = useRef(0);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedBranch");
    window.dispatchEvent(new Event("tokenChanged"));
    navigate("/", { replace: true });
  }, [navigate]);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Update last activity time
    lastActivityRef.current = new Date().getTime();

    // Set new timeout
    const timeoutMs = timeoutMinutes * 60 * 1000;
    timeoutRef.current = setTimeout(() => {
      console.log(
        "Session timeout: User inactive for",
        timeoutMinutes,
        "minutes"
      );
      handleLogout();
    }, timeoutMs);
  }, [timeoutMinutes, enabled, handleLogout]);

  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!enabled) return;

    // Initialize timer
    resetTimer();

    // Listen for user activity events
    const events = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, true);
    });

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity, true);
      });
    };
  }, [enabled, handleActivity, resetTimer]);

  return { resetTimer, handleActivity };
};

export default useSessionTimeout;
