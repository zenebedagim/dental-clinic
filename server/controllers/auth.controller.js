const prisma = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendSuccess, sendError } = require("../utils/response.util");
const { logLogin } = require("../middleware/audit.middleware");
const auditService = require("../services/audit.service");
const { clearRateLimit } = require("../middleware/rateLimiter");
require("dotenv").config();

const login = async (req, res) => {
  try {
    // Debug: Log incoming request
    console.log("Login attempt - Request body:", { email: req.body?.email, password: req.body?.password ? "***" : undefined });
    console.log("Login attempt - Full req.body:", req.body);
    console.log("Login attempt - Content-Type:", req.headers['content-type']);
    
    // Safety check for req.body
    if (!req.body || typeof req.body !== 'object') {
      console.log("Login attempt failed: req.body is missing or invalid");
      return sendError(res, "Request body is required. Make sure to send JSON with Content-Type: application/json", 400);
    }
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log("Login attempt failed: Missing email or password");
      return sendError(res, "Email and password are required", 400);
    }

    // Normalize email (trim and lowercase)
    const normalizedEmail = email.trim().toLowerCase();
    console.log("Login attempt - Normalized email:", normalizedEmail);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { branch: true },
    });

    if (!user) {
      console.log(`Login attempt failed: User not found for email: ${normalizedEmail}`);
      return sendError(res, "Invalid email or password. Make sure the admin user exists in the database. Run 'npm run setup' in the server directory to create it.", 401);
    }

    console.log(`Login attempt - User found: ${user.email}, role: ${user.role}`);
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log(`Login attempt failed: Invalid password for user: ${normalizedEmail}`);
      // Log failed login attempt
      logLogin(user.id, req, false).catch((err) => {
        console.error("Error logging failed login:", err);
      });
      return sendError(res, "Invalid email or password", 401);
    }

    console.log(`Login successful for user: ${normalizedEmail}`);

    // Clear rate limit on successful login (allow immediate re-login if needed)
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    clearRateLimit(ip);

    // Log successful login
    logLogin(user.id, req, true).catch((err) => {
      console.error("Error logging login:", err);
    });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return sendSuccess(
      res,
      {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          branchId: user.branchId,
          branch: user.branch,
        },
      },
      200,
      "Login successful"
    );
  } catch (error) {
    console.error("Login error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

const register = async (req, res) => {
  try {
    const { name, email, password, role, branchId } = req.body;

    if (!name || !email || !password || !role || !branchId) {
      return sendError(res, "All fields are required", 400);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return sendError(res, "User already exists", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        branchId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
      },
    });

    // Log audit action
    await auditService.logAction(
      req.user.id,
      "CREATE",
      "User",
      user.id,
      null,
      { name, email, role, branchId },
      req,
      branchId
    ).catch((err) => {
      console.error("Error logging user creation:", err);
    });

    return sendSuccess(res, user, 201, "User created successfully");
  } catch (error) {
    console.error("Register error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

module.exports = { login, register };
