/**
 * Notification Toast Component
 * Real-time toast notifications with priority-based behavior
 */

import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "../../context/NotificationContext";

const NotificationToast = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);
  const { acknowledgeNotification, markAsRead } = useNotifications();
  const navigate = useNavigate();

  // Priority-based duration
  const getDuration = (priority) => {
    const durations = {
      CRITICAL: 0, // Sticky, no auto-dismiss
      HIGH: 8000,
      NORMAL: 5000,
      LOW: 3000,
    };
    return durations[priority] || 5000;
  };

  const duration = getDuration(notification.priority);
  const isSticky = notification.priority === "CRITICAL";

  useEffect(() => {
    // Send ACK if required
    if (notification.requiresAck) {
      acknowledgeNotification(notification.id, notification.eventId);
    }

    // Auto-dismiss (unless sticky)
    if (!isSticky && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [notification, duration, isSticky, onClose, acknowledgeNotification]);

  // Play sound based on priority
  useEffect(() => {
    if (
      notification.priority === "CRITICAL" ||
      notification.priority === "HIGH"
    ) {
      // Play notification sound (if browser allows)
      try {
        const audio = new Audio("/notification.mp3"); // You can add a sound file
        audio.volume = 0.5;
        audio.play().catch(() => {
          // Ignore if autoplay is blocked
        });
      } catch {
        // Ignore audio errors
      }
    }
  }, [notification.priority]);

  const handleClick = () => {
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (!isSticky) {
      setIsVisible(false);
      setTimeout(onClose, 300);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const getPriorityStyles = (priority) => {
    const styles = {
      CRITICAL: {
        bg: "bg-red-600",
        text: "text-white",
        border: "border-red-700",
        icon: "⚠️",
      },
      HIGH: {
        bg: "bg-orange-500",
        text: "text-white",
        border: "border-orange-600",
        icon: "🔔",
      },
      NORMAL: {
        bg: "bg-blue-500",
        text: "text-white",
        border: "border-blue-600",
        icon: "ℹ️",
      },
      LOW: {
        bg: "bg-gray-500",
        text: "text-white",
        border: "border-gray-600",
        icon: "📌",
      },
    };
    return styles[priority] || styles.NORMAL;
  };

  const styles = getPriorityStyles(notification.priority);

  if (!isVisible) return null;

  return (
    <div
      className={`${styles.bg} ${styles.text} ${
        styles.border
      } border-l-4 px-4 py-3 rounded-lg shadow-lg flex items-start justify-between min-w-[300px] max-w-md transform transition-all duration-300 ease-in-out ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      } ${isSticky ? "ring-2 ring-red-400" : ""}`}
      role="alert"
      onClick={handleClick}
      style={{ cursor: notification.actionUrl ? "pointer" : "default" }}
    >
      <div className="flex items-start flex-1">
        <span className="text-xl mr-2">{styles.icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold">{notification.title}</p>
            {!notification.read && (
              <span className="w-2 h-2 bg-white rounded-full"></span>
            )}
          </div>
          <p className="text-sm opacity-90">{notification.message}</p>
          {/* Display patient information if available */}
          {notification.data?.patient && (
            <div className="mt-2 text-xs opacity-80 space-y-0.5">
              <p>Patient: {notification.data.patient.name || "N/A"}</p>
              {notification.data.patient.phone && (
                <p>Phone: {notification.data.patient.phone}</p>
              )}
              {notification.data.patient.cardNo && (
                <p>Card: {notification.data.patient.cardNo}</p>
              )}
            </div>
          )}
          {isSticky && (
            <p className="text-xs mt-1 opacity-75">Click to view details</p>
          )}
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        className="ml-4 text-white hover:text-gray-200 focus:outline-none"
        aria-label="Close"
      >
        <svg
          className="h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
};

/**
 * Notification Toast Container
 * Manages multiple toast notifications
 */
export const NotificationToastContainer = () => {
  const { notifications } = useNotifications();

  // Show only unread, high-priority notifications as toasts
  const activeToasts = useMemo(() => {
    return notifications
      .filter(
        (n) => !n.read && (n.priority === "CRITICAL" || n.priority === "HIGH")
      )
      .slice(0, 3); // Max 3 toasts at once
  }, [notifications]);

  const [closedToasts, setClosedToasts] = useState(new Set());

  const handleClose = (notificationId) => {
    setClosedToasts((prev) => new Set([...prev, notificationId]));
  };

  // Filter out closed toasts
  const visibleToasts = activeToasts.filter(
    (toast) => !closedToasts.has(toast.id)
  );

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {visibleToasts.map((notification) => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={() => handleClose(notification.id)}
        />
      ))}
    </div>
  );
};

export default NotificationToast;
