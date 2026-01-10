import { useEffect, useState, useRef } from "react";

/**
 * Custom hook to detect page visibility changes
 * Tracks when page becomes hidden/visible using Page Visibility API
 * Returns visibility state and whether user was away
 */
const usePageVisibility = () => {
  // Initialize with current document visibility state
  const [isVisible, setIsVisible] = useState(() => !document.hidden);
  const [wasAway, setWasAway] = useState(false);
  const hiddenTimeRef = useRef(null);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      // Clear any existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Debounce rapid visibility changes (ignore if < 2 seconds)
      debounceTimerRef.current = setTimeout(() => {
        const isCurrentlyVisible = !document.hidden;
        const isCurrentlyHidden = document.hidden;

        if (isCurrentlyHidden) {
          // Page became hidden - store timestamp
          if (hiddenTimeRef.current === null) {
            hiddenTimeRef.current = Date.now();
          }
          setIsVisible(false);
          setWasAway(false);
        } else if (isCurrentlyVisible) {
          // Page became visible again
          const now = Date.now();
          const timeHidden = hiddenTimeRef.current
            ? now - hiddenTimeRef.current
            : 0;

          setIsVisible(true);

          // Only set wasAway if user was away for > 2 seconds (accounting for debounce)
          if (timeHidden > 2000) {
            setWasAway(true);
          } else {
            setWasAway(false);
          }

          // Reset hidden time
          hiddenTimeRef.current = null;
        }
      }, 2000); // 2 second debounce
    };

    // Listen for visibility change events
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []); // Empty dependency array - only run on mount/unmount

  // Reset wasAway after it's been consumed
  const resetWasAway = () => {
    setWasAway(false);
    hiddenTimeRef.current = null;
  };

  return { isVisible, wasAway, resetWasAway };
};

export default usePageVisibility;
