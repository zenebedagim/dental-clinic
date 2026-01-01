/**
 * useToast Hook
 * Convenience hook for accessing toast functions
 */

import { useToast as useToastContext } from "../context/ToastContext";

export const useToast = () => {
  const { showToast, removeToast, success, error, warning, info } =
    useToastContext();

  return {
    showToast,
    removeToast,
    success,
    error,
    warning,
    info,
  };
};

export default useToast;
