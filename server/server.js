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
const corsOptions = {
  origin: process.env.FRONTEND_URL
    ? [
        process.env.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:5174",
      ]
    : process.env.NODE_ENV === "production"
    ? [process.env.FRONTEND_URL]
    : true, // Allow all in development
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  maxAge: 86400, // 24 hours
};

app.use(cors(corsOptions));

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
const notificationRoutes = require("./routes/notification.routes");

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
app.use("/api/notifications", notificationRoutes);

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

  // Start notification worker (only in non-serverless environments)
  const notificationWorker = require("./workers/notificationWorker");
  console.log("Notification worker started");
}

// Initialize metrics service
const metricsService = require("./services/notificationMetrics.service");
console.log("Notification metrics service initialized");

// Metrics endpoint
app.get("/api/notifications/metrics", async (req, res) => {
  try {
    const metrics = await metricsService.getComprehensiveMetrics();
    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching metrics",
      error: error.message,
    });
  }
});

const PORT = process.env.PORT || 5000;

// Only start HTTP server if not in serverless environment (Vercel)
if (process.env.VERCEL !== "1") {
  httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Socket.io is available at ws://localhost:${PORT}`);
  });
}

// Export app for Vercel serverless functions
module.exports = app;
