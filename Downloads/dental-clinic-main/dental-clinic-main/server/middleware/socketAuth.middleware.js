/**
 * Socket Authentication Middleware
 * Authenticates WebSocket connections using JWT
 */

const jwt = require("jsonwebtoken");
const prisma = require("../config/db");

// Rate limiting: track connection attempts
const connectionAttempts = new Map();
const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW = 60000; // 1 minute

/**
 * Authenticate socket connection
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    // Rate limiting check
    const clientId = socket.handshake.address || socket.id;
    const attempts = connectionAttempts.get(clientId) || {
      count: 0,
      resetAt: Date.now() + ATTEMPT_WINDOW,
    };

    if (Date.now() > attempts.resetAt) {
      attempts.count = 0;
      attempts.resetAt = Date.now() + ATTEMPT_WINDOW;
    }

    if (attempts.count >= MAX_ATTEMPTS) {
      return next(
        new Error("Authentication error: Too many connection attempts")
      );
    }

    attempts.count++;
    connectionAttempts.set(clientId, attempts);

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user from database to ensure user still exists and get latest data
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
      },
    });

    if (!user) {
      return next(new Error("Authentication error: User not found"));
    }

    // Attach user data to socket
    socket.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
    };

    // Reset attempts on successful authentication
    connectionAttempts.delete(clientId);

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return next(new Error("Authentication error: Invalid token"));
    }
    if (error.name === "TokenExpiredError") {
      return next(new Error("Authentication error: Token expired"));
    }
    console.error("Socket authentication error:", error);
    return next(new Error("Authentication error: " + error.message));
  }
};

/**
 * Check if user has permission for room
 */
const checkRoomPermission = async (socket, room) => {
  if (!socket.user) {
    return false;
  }

  const { role, branchId, id: userId } = socket.user;

  // Admin can join any room
  if (role === "ADMIN") {
    return true;
  }

  // Check user-specific room
  if (room.startsWith(`user:${userId}`)) {
    return true;
  }

  // Check role-based room
  if (room.startsWith(`role:${role}`)) {
    if (room.includes(`branch:${branchId}`)) {
      return true;
    }
  }

  // Check branch-based room
  if (room.startsWith(`branch:${branchId}`)) {
    return true;
  }

  return false;
};

module.exports = {
  authenticateSocket,
  checkRoomPermission,
};
