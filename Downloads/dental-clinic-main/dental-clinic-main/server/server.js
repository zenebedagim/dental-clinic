const express = require("express");
const cors = require("cors");
const http = require("http");
const compression = require("compression");
require("dotenv").config();

const app = express();
const httpServer = http.createServer(app);

// Security and optimization middleware
app.use(compression()); // Enable gzip compression

// CORS configuration - optimized for production
// Build allowed origins array
const allowedOrigins = [];

// Add production frontend URL(s) if set
// Supports comma-separated multiple URLs or single URL
if (process.env.FRONTEND_URL) {
  const frontendUrls = process.env.FRONTEND_URL.split(",").map((url) =>
    url.trim()
  );
  allowedOrigins.push(...frontendUrls);
}

// Add localhost for development (always allow)
allowedOrigins.push("http://localhost:5173", "http://localhost:5174");

// Determine origin function for CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin is in allowed list
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // In production, be strict; in development, allow all
      if (process.env.NODE_ENV === "production") {
        console.warn(`CORS: Blocked origin: ${origin}`);
        callback(new Error("Not allowed by CORS"));
      } else {
        callback(null, true);
      }
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  exposedHeaders: ["Content-Length", "X-Foo", "X-Bar"],
  maxAge: 86400, // 24 hours - cache preflight for 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204, // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

// Apply CORS middleware
app.use(cors(corsOptions));

// Log CORS configuration on startup (for debugging)
if (process.env.NODE_ENV === "development" || process.env.LOG_CORS === "true") {
  console.log("=== CORS Configuration ===");
  console.log("Allowed Origins:", allowedOrigins);
  console.log("FRONTEND_URL:", process.env.FRONTEND_URL || "NOT SET");
  console.log("NODE_ENV:", process.env.NODE_ENV || "development");
  console.log("==========================");
}

// Security headers middleware
app.use((req, res, next) => {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Remove X-Powered-By header
  res.removeHeader("X-Powered-By");

  next();
});

// Body parsing with size limits (optimized for serverless)
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting - apply to all API routes
const { apiRateLimiter } = require("./middleware/rateLimiter");
app.use("/api", apiRateLimiter);

// Routes
const authRoutes = require("./routes/auth.routes");
const branchRoutes = require("./routes/branch.routes");
const appointmentRoutes = require("./routes/appointment.routes");
const treatmentRoutes = require("./routes/treatment.routes");
const xrayRoutes = require("./routes/xray.routes");
const userRoutes = require("./routes/user.routes");
const historyRoutes = require("./routes/history.routes");
const patientRoutes = require("./routes/patient.routes");
const scheduleRoutes = require("./routes/schedule.routes");
const paymentRoutes = require("./routes/payment.routes");

app.use("/api/auth", authRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/treatments", treatmentRoutes);
app.use("/api/xray", xrayRoutes);
app.use("/api/users", userRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/payments", paymentRoutes);

// Root route for Vercel
app.get("/", (req, res) => {
  res.json({
    message: "Dental Clinic Management System API",
    status: "running",
  });
});

// Enhanced health check with database status
app.get("/api/health", async (req, res) => {
  try {
    const prisma = require("./config/db");
    // Quick database connection test
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      message: "Server is running",
      status: "healthy",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      database: "connected",
      version: "1.0.0",
    });
  } catch (error) {
    res.status(503).json({
      message: "Server is running but database connection failed",
      status: "degraded",
      timestamp: new Date().toISOString(),
      database: "disconnected",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// 404 handler (must be after all routes)
const {
  notFoundHandler,
  errorHandler,
} = require("./middleware/error.middleware");
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize Socket.io (only in non-serverless environments)
if (process.env.VERCEL !== "1") {
  const { initializeSocketIO } = require("./socket/socketServer");
  initializeSocketIO(httpServer);
  console.log("Socket.io initialized");
}

const PORT = process.env.PORT || 5000;

// Only start HTTP server if not in serverless environment (Vercel)
if (process.env.VERCEL !== "1") {
  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Socket.io is available at ws://localhost:${PORT}`);
  });
}

// Graceful shutdown handlers
let httpServerInstance = null;
if (process.env.VERCEL !== "1") {
  httpServerInstance = httpServer;
}

const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  let shutdownComplete = false;

  // Set timeout for forced exit if cleanup takes too long
  const forceExitTimer = setTimeout(() => {
    if (!shutdownComplete) {
      console.log("Forced shutdown after timeout");
      process.exit(1);
    }
  }, 10000); // Force exit after 10 seconds

  try {
    // Stop accepting new connections
    if (httpServerInstance) {
      await new Promise((resolve) => {
        httpServerInstance.close(() => {
          console.log("HTTP server closed");
          resolve();
        });
      });
    }

    // Close Socket.io connections
    try {
      const { closeSocketIO } = require("./socket/socketServer");
      await closeSocketIO();
      console.log("Socket.io server closed");
    } catch (error) {
      // Socket.io might not be initialized
      console.log("Socket.io cleanup skipped (not initialized)");
    }

    // Close database connections
    try {
      const prisma = require("./config/db");
      await prisma.$disconnect();
      console.log("Database connections closed");
    } catch (error) {
      console.error("Error closing database:", error);
    }

    shutdownComplete = true;
    clearTimeout(forceExitTimer);
    console.log("Graceful shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("Error during graceful shutdown:", error);
    shutdownComplete = true;
    clearTimeout(forceExitTimer);
    process.exit(1);
  }
};

// Handle termination signals (only in non-serverless environments)
if (process.env.VERCEL !== "1") {
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Handle uncaught errors
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    gracefulShutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    gracefulShutdown("unhandledRejection");
  });
}

// Export app for Vercel serverless functions
module.exports = app;
