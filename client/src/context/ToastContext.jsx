import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import Toast from "../components/common/Toast";

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Use ref to access removeToast in showToast without dependency issues
  const removeToastRef = useRef(removeToast);

  // Update ref when removeToast changes (useEffect ensures it's updated after render)
  useEffect(() => {
    removeToastRef.current = removeToast;
  }, [removeToast]);

  const showToast = useCallback((message, type = "info", duration = 5000) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      message,
      type, // success, error, warning, info
      duration,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        // Use ref.current which is always up-to-date
        removeToastRef.current?.(id);
      }, duration);
    }

    return id;
  }, []);

  const success = useCallback(
    (message, duration) => showToast(message, "success", duration),
    [showToast]
  );
  const error = useCallback(
    (message, duration) => showToast(message, "error", duration),
    [showToast]
  );
  const warning = useCallback(
    (message, duration) => showToast(message, "warning", duration),
    [showToast]
  );
  const info = useCallback(
    (message, duration) => showToast(message, "info", duration),
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        showToast,
        removeToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <Toast
              key={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
