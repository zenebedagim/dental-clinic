import { useState } from "react";

const STORAGE_KEY = "selectedBranch";

/**
 * Custom hook to manage selected branch in localStorage
 * @returns {Object} { selectedBranch, setSelectedBranch, clearSelectedBranch }
 */
export const useBranch = () => {
  // Load selected branch from localStorage on mount using lazy initialization
  const [selectedBranch, setSelectedBranchState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (error) {
        console.error(
          "Error parsing selected branch from localStorage:",
          error
        );
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
    }
    return null;
  });

  /**
   * Set the selected branch and save to localStorage
   * @param {Object} branch - Branch object with id, name, code, etc.
   */
  const setSelectedBranch = (branch) => {
    if (branch) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(branch));
      setSelectedBranchState(branch);
    } else {
      clearSelectedBranch();
    }
  };

  /**
   * Clear the selected branch from localStorage
   */
  const clearSelectedBranch = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSelectedBranchState(null);
  };

  /**
   * Get selected branch ID
   * @returns {string|null} Branch ID or null
   */
  const getSelectedBranchId = () => {
    return selectedBranch?.id || null;
  };

  return {
    selectedBranch,
    setSelectedBranch,
    clearSelectedBranch,
    getSelectedBranchId,
  };
};

export default useBranch;
