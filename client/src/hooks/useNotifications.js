/**
 * useNotifications Hook
 * Custom hook for notification management
 */

import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

/**
 * Enhanced notification hook with navigation helpers
 */
const useNotificationHandler = () => {
  const notifications = useNotifications();
  const navigate = useNavigate();

  /**
   * Handle notification click/action
   */
  const handleNotificationAction = async (notification) => {
    // Mark as read if not already
    if (!notification.read) {
      await notifications.markAsRead(notification.id);
    }

    // Navigate to action URL if provided
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  /**
   * Get notifications by priority
   */
  const getNotificationsByPriority = (priority) => {
    return notifications.notifications.filter((n) => n.priority === priority);
  };

  /**
   * Get unread notifications
   */
  const getUnreadNotifications = () => {
    return notifications.notifications.filter((n) => !n.read);
  };

  /**
   * Get critical notifications
   */
  const getCriticalNotifications = () => {
    return notifications.notifications.filter(
      (n) => n.priority === 'CRITICAL' && !n.read
    );
  };

  return {
    ...notifications,
    handleNotificationAction,
    getNotificationsByPriority,
    getUnreadNotifications,
    getCriticalNotifications,
  };
};

export default useNotificationHandler;
export { useNotifications };

