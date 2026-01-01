/**
 * Socket.io Server Setup
 * Initializes Socket.io and handles connections
 */

const { Server } = require("socket.io");
const notificationService = require("../services/notification.service");
const { authenticateSocket } = require("../middleware/socketAuth.middleware");
const metricsService = require("../services/notificationMetrics.service");

let io = null;

/**
 * Initialize Socket.io server
 */
const initializeSocketIO = (httpServer) => {
  // Create Socket.io server
  io = new Server(httpServer, {
    cors: {
      origin:
        process.env.SOCKET_IO_CORS_ORIGIN ||
        process.env.FRONTEND_URL ||
        "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: process.env.SOCKET_IO_PATH || "/socket.io",
    transports: ["websocket", "polling"],
  });

  console.log("Socket.io initialized (single server mode).");

  // Set Socket.io instance in notification service
  notificationService.setSocketIO(io);

  // Authentication middleware
  io.use(authenticateSocket);

  // Connection handler
  io.on("connection", async (socket) => {
    const { id: userId, role, branchId } = socket.user;

    console.log(`User ${userId} (${role}) connected: ${socket.id}`);

    // Register user socket
    notificationService.registerUserSocket(userId, socket.id);
    metricsService.setActiveConnections(io.sockets.sockets.size);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join role-based room
    socket.join(`role:${role}:branch:${branchId}`);

    // Join branch-based room
    socket.join(`branch:${branchId}`);

    // Deliver pending notifications from database
    try {
      const pendingNotifications =
        await notificationService.getPendingNotifications(userId);
      for (const notification of pendingNotifications) {
        socket.emit("notification", notification);

        // Mark as delivered if notification exists in DB
        if (notification.id) {
          const prisma = require("../config/db");
          await prisma.notification.update({
            where: { id: notification.id },
            data: {
              delivered: true,
              deliveredAt: new Date(),
            },
          });
        }
      }
    } catch (error) {
      console.error("Error delivering pending notifications:", error);
    }

    // Handle ACK
    socket.on("notification:ack", async (data) => {
      try {
        const { notificationId, eventId } = data;

        if (notificationId) {
          await notificationService.acknowledgeNotification(
            notificationId,
            userId
          );
        } else if (eventId) {
          // Find notification by eventId
          const prisma = require("../config/db");
          const notification = await prisma.notification.findUnique({
            where: { eventId },
          });

          if (notification && notification.userId === userId) {
            await notificationService.acknowledgeNotification(
              notification.id,
              userId
            );
          }
        }
      } catch (error) {
        console.error("Error handling ACK:", error);
      }
    });

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      console.log(`User ${userId} disconnected: ${reason}`);

      // Unregister user socket
      notificationService.unregisterUserSocket(userId, socket.id);
      metricsService.setActiveConnections(io.sockets.sockets.size);
    });

    // Handle error
    socket.on("error", (error) => {
      console.error(`Socket error for user ${userId}:`, error);
    });
  });

  // Handle server errors
  io.on("error", (error) => {
    console.error("Socket.io server error:", error);
  });

  return io;
};

/**
 * Get Socket.io instance
 */
const getIO = () => {
  if (!io) {
    throw new Error(
      "Socket.io not initialized. Call initializeSocketIO first."
    );
  }
  return io;
};

/**
 * Broadcast to room
 */
const broadcastToRoom = (room, event, data) => {
  if (io) {
    io.to(room).emit(event, data);
  }
};

/**
 * Send to user
 */
const sendToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

module.exports = {
  initializeSocketIO,
  getIO,
  broadcastToRoom,
  sendToUser,
};
