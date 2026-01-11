/**
 * Socket.io Server Setup
 * Initializes Socket.io and handles connections
 */

const { Server } = require("socket.io");
const { authenticateSocket } = require("../middleware/socketAuth.middleware");

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

  // Authentication middleware
  io.use(authenticateSocket);

  // Connection handler
  io.on("connection", async (socket) => {
    const { id: userId, role, branchId } = socket.user;

    console.log(`User ${userId} (${role}) connected: ${socket.id}`);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Join role-based room with branch
    socket.join(`role:${role}:branch:${branchId}`);

    // Join generic role-based room (for broadcasting to all users of a role)
    socket.join(`role:${role}`);

    // Join branch-based room
    socket.join(`branch:${branchId}`);

    // Handle disconnect
    socket.on("disconnect", (reason) => {
      console.log(`User ${userId} disconnected: ${reason}`);
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
 * Supports role-based rooms (e.g., "role:ADMIN" broadcasts to all admin users)
 */
const broadcastToRoom = (room, event, data) => {
  if (!io) return;

  // Direct room broadcast (works for generic role rooms like "role:ADMIN")
  io.to(room).emit(event, data);
};

/**
 * Send to user
 */
const sendToUser = (userId, event, data) => {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
};

/**
 * Close Socket.io server gracefully
 */
const closeSocketIO = () => {
  return new Promise((resolve) => {
    if (!io) {
      resolve();
      return;
    }

    io.close(() => {
      io = null;
      resolve();
    });
  });
};

module.exports = {
  initializeSocketIO,
  getIO,
  broadcastToRoom,
  sendToUser,
  closeSocketIO,
};
