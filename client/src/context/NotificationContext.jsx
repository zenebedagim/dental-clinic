/**
 * Notification Context
 * Global notification state management
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { initializeSocket, emit, isConnected } from "../services/socketService";
import api from "../services/api";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadByPriority, setUnreadByPriority] = useState({
    LOW: 0,
    NORMAL: 0,
    HIGH: 0,
    CRITICAL: 0,
  });
  const [socketConnected, setSocketConnected] = useState(false);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.get("/notifications/unread");
      const data = response.data?.data || response.data;
      setUnreadCount(data.count || 0);

      // Fetch by priority
      const priorities = ["LOW", "NORMAL", "HIGH", "CRITICAL"];
      const priorityCounts = {};

      for (const priority of priorities) {
        try {
          const priorityResponse = await api.get("/notifications/unread", {
            params: { priority },
          });
          priorityCounts[priority] = priorityResponse.data?.data?.count || 0;
        } catch {
          priorityCounts[priority] = 0;
        }
      }

      setUnreadByPriority(priorityCounts);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  }, []);

  // Add notification
  const addNotification = useCallback((notification) => {
    setNotifications((prev) => {
      // Check for duplicates
      const exists = prev.find(
        (n) => n.id === notification.id || n.eventId === notification.eventId
      );
      if (exists) {
        return prev;
      }

      // Add to beginning
      return [notification, ...prev].slice(0, 100); // Keep last 100
    });

    // Update unread count if not read
    if (!notification.read) {
      setUnreadCount((prev) => prev + 1);
      setUnreadByPriority((prev) => ({
        ...prev,
        [notification.priority]: (prev[notification.priority] || 0) + 1,
      }));
    }
  }, []);

  // Initialize socket on mount
  useEffect(() => {
    const socket = initializeSocket();
    if (socket) {
      setSocketConnected(isConnected());

      // Listen for connection status
      const handleConnect = () => {
        setSocketConnected(true);
        fetchUnreadCount();
      };

      const handleDisconnect = () => {
        setSocketConnected(false);
      };

      // Listen for notifications
      const handleNotification = (notification) => {
        addNotification(notification);

        // Send ACK if required
        if (notification.requiresAck) {
          emit("notification:ack", {
            notificationId: notification.id,
            eventId: notification.eventId,
          });
        }
      };

      socket.on("connect", handleConnect);
      socket.on("disconnect", handleDisconnect);
      socket.on("notification", handleNotification);

      // Cleanup
      return () => {
        socket.off("notification", handleNotification);
        socket.off("connect", handleConnect);
        socket.off("disconnect", handleDisconnect);
      };
    }
  }, [addNotification, fetchUnreadCount]);

  // Mark as read
  const markAsRead = useCallback(
    async (notificationId) => {
      try {
        await api.put(`/notifications/${notificationId}/read`);

        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, read: true, readAt: new Date().toISOString() }
              : n
          )
        );

        setUnreadCount((prev) => Math.max(0, prev - 1));

        // Update priority count
        const notification = notifications.find((n) => n.id === notificationId);
        if (notification && !notification.read) {
          setUnreadByPriority((prev) => ({
            ...prev,
            [notification.priority]: Math.max(
              0,
              (prev[notification.priority] || 0) - 1
            ),
          }));
        }
      } catch (error) {
        console.error("Error marking notification as read:", error);
      }
    },
    [notifications]
  );

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await api.put("/notifications/read-all");

      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read: true,
          readAt: new Date().toISOString(),
        }))
      );

      setUnreadCount(0);
      setUnreadByPriority({
        LOW: 0,
        NORMAL: 0,
        HIGH: 0,
        CRITICAL: 0,
      });
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }, []);

  // Acknowledge notification
  const acknowledgeNotification = useCallback((notificationId, eventId) => {
    emit("notification:ack", {
      notificationId,
      eventId,
    });
  }, []);

  // Clear all notifications (from UI only, not from server)
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Fetch notifications from server
  const fetchNotifications = useCallback(async (limit = 50, offset = 0) => {
    try {
      const response = await api.get("/notifications", {
        params: { limit, offset },
      });
      const data = response.data?.data || response.data;
      const fetchedNotifications = data.notifications || data || [];

      setNotifications(fetchedNotifications);
      return fetchedNotifications;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }
  }, []);

  const value = {
    notifications,
    unreadCount,
    unreadByPriority,
    socketConnected,
    addNotification,
    markAsRead,
    markAllAsRead,
    acknowledgeNotification,
    clearAll,
    fetchNotifications,
    fetchUnreadCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within NotificationProvider"
    );
  }
  return context;
};

export default NotificationContext;
