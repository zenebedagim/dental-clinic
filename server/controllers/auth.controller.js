const prisma = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { sendSuccess, sendError } = require("../utils/response.util");
const auditService = require("../services/audit.service");
const { logLogin } = require("../middleware/audit.middleware");
const { broadcastToRoom } = require("../socket/socketServer");
const { encryptPassword } = require("../utils/crypto.util");

// Login endpoint
const login = async (req, res) => {
  try {
    const { phone: rawPhone, password: rawPassword } = req.body;

    if (!rawPhone || !rawPassword) {
      return sendError(res, "Phone and password are required", 400);
    }

    // Trim and normalize values
    const phone = String(rawPhone).trim();
    const trimmedPassword = String(rawPassword).trim();

    if (!phone || !trimmedPassword) {
      return sendError(res, "Phone and password are required", 400);
    }

    // Normalize phone number (remove spaces, handle +251 prefix, ensure format)
    // Phone should already be validated and normalized by validator, but ensure it's clean
    let normalizedPhone = phone.replace(/\s+/g, "").replace(/^\+251/, "0");

    // If doesn't start with 0, add it (for numbers like 912345678)
    if (!normalizedPhone.startsWith("0")) {
      normalizedPhone = `0${normalizedPhone}`;
    }

    // Validate Ethiopian mobile phone format (already validated by validator, but double-check)
    // Pattern: ^0[9]\d{8}$ enforces Ethiopian mobile format (second digit must be 9)
    if (!/^0[9]\d{8}$/.test(normalizedPhone)) {
      await logLogin(null, req, false).catch(() => {});
      return sendError(res, "Invalid phone number format", 400);
    }

    // Find user by phone (stored in email field)
    const user = await prisma.user.findUnique({
      where: { email: normalizedPhone },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!user) {
      // Check if admin exists with different phone format for debugging
      if (normalizedPhone === "0911922363") {
        const adminByRole = await prisma.user.findFirst({
          where: { role: "ADMIN" },
          select: { email: true, name: true },
        });
        if (adminByRole && adminByRole.email !== normalizedPhone) {
          console.error(
            `Admin phone mismatch: Database has "${adminByRole.email}", but login attempted with "${normalizedPhone}"`
          );
        }
      }
      // Log failed attempt (don't reveal if phone exists)
      await logLogin(null, req, false).catch(() => {});
      return sendError(res, "Invalid phone or password", 401);
    }

    // For admin users, check if trying to use default password after first login
    if (user.role === "ADMIN" && trimmedPassword === "admin123") {
      const firstLoginCompleted = user.firstLoginCompleted || false;

      // If first login has been completed, block default credentials
      if (firstLoginCompleted) {
        await logLogin(user.id, req, false).catch(() => {});
        return sendError(
          res,
          "Default credentials have expired after first login. Please use password reset or contact administrator.",
          401
        );
      }

      // First login with default credentials: verify password, then set firstLoginCompleted = true
      // Compare password with bcrypt hash to verify it's actually the default password
      const isPasswordValid = await bcrypt.compare(
        trimmedPassword,
        user.password
      );

      if (!isPasswordValid) {
        await logLogin(user.id, req, false).catch(() => {});
        return sendError(res, "Invalid phone or password", 401);
      }

      // First login successful with default credentials
      // Set firstLoginCompleted = true and passwordChanged = false (force password change)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          firstLoginCompleted: true,
          passwordChanged: false,
        },
      });

      // Set passwordChanged flag for response (will trigger password change flow)
      const passwordChanged = false;

      // Generate JWT token
      const token = jwt.sign(
        {
          id: user.id,
          name: user.name,
          phone: normalizedPhone,
          role: user.role,
          branchId: user.branchId,
          passwordChanged,
        },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
      );

      // Log successful login
      await logLogin(user.id, req, true).catch((err) => {
        console.error("Error logging login:", err);
      });

      // Prepare user response
      const userResponse = {
        id: user.id,
        name: user.name,
        phone: normalizedPhone,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branch: user.branch,
        passwordChanged,
      };

      return sendSuccess(
        res,
        {
          token,
          user: userResponse,
        },
        200,
        "Login successful. Please change your password."
      );
    }

    // For all other cases (non-default password or non-admin), use normal password verification
    // Compare password with bcrypt hash
    const isPasswordValid = await bcrypt.compare(
      trimmedPassword,
      user.password
    );

    if (!isPasswordValid) {
      // Log failed attempt
      await logLogin(user.id, req, false).catch(() => {});
      return sendError(res, "Invalid phone or password", 401);
    }

    // For admin users with changed password, use passwordChanged flag from database
    // For other roles, use the passwordChanged flag from database
    let passwordChanged = user.passwordChanged || false;

    if (user.role === "ADMIN") {
      // Admin with changed password - passwordChanged flag should already be correct
      // Just ensure it's set if password is not default
      if (!user.passwordChanged) {
        // Password has been changed from default, update flag
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordChanged: true },
        });
        passwordChanged = true;
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        name: user.name,
        phone: normalizedPhone,
        role: user.role,
        branchId: user.branchId,
        passwordChanged,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" } // 30 days expiration
    );

    // Log successful login
    await logLogin(user.id, req, true).catch((err) => {
      console.error("Error logging login:", err);
    });

    // Prepare user response (exclude password)
    const userResponse = {
      id: user.id,
      name: user.name,
      phone: normalizedPhone,
      email: user.email, // Include email for compatibility
      role: user.role,
      branchId: user.branchId,
      branch: user.branch,
      passwordChanged,
    };

    return sendSuccess(
      res,
      {
        token,
        user: userResponse,
      },
      200,
      "Login successful"
    );
  } catch (error) {
    console.error("Login error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

// Change password for authenticated user
const changePassword = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return sendError(
        res,
        "Current password and new password are required",
        400
      );
    }

    if (newPassword.length < 6) {
      return sendError(res, "New password must be at least 6 characters", 400);
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      return sendError(res, "User not found", 404);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      return sendError(res, "Current password is incorrect", 401);
    }

    // Hash new password with bcrypt for authentication
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);

    // Encrypt plaintext password with AES for admin visibility
    const encryptedPassword = encryptPassword(newPassword.trim());

    // Get current timestamp for password change tracking
    const now = new Date();

    // Update password and set password tracking fields
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        adminVisiblePassword: encryptedPassword, // AES-encrypted plaintext
        passwordChanged: true,
        passwordChangedBy: userId, // User changed own password
        passwordChangedAt: now,
        passwordChangedByUserFlag: true, // Password changed by user
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        passwordChanged: true,
        passwordChangedBy: true,
        passwordChangedAt: true,
        passwordChangedByUserFlag: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    // Log audit action
    await auditService
      .logAction(
        userId,
        "UPDATE",
        "User",
        userId,
        null,
        { passwordChanged: true, changedBy: "user" },
        req,
        null
      )
      .catch((err) => {
        console.error("Error logging password change:", err);
      });

    // Emit WebSocket event for real-time password sync to admin room
    try {
      broadcastToRoom("role:ADMIN", "password_changed", {
        userId,
        newPassword: newPassword.trim(), // Decrypted password for admin view
        changedBy: "user",
        changedByUserId: userId,
        timestamp: now.toISOString(),
      });
    } catch (err) {
      console.error("Error emitting password change event:", err);
    }

    // Map email to phone for frontend compatibility
    const userResponse = {
      ...updatedUser,
      phone: /^[0-9]{10,15}$/.test(updatedUser.email)
        ? updatedUser.email
        : null,
    };

    return sendSuccess(res, userResponse, 200, "Password changed successfully");
  } catch (error) {
    console.error("Change password error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

// Verify password for sensitive operations
const verifyPassword = async (req, res) => {
  try {
    const { id: userId } = req.user;
    const { password } = req.body;

    if (!password) {
      return sendError(res, "Password is required", 400);
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      return sendError(res, "User not found", 404);
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return sendError(res, "Password is incorrect", 401);
    }

    return sendSuccess(res, { verified: true }, 200, "Password verified");
  } catch (error) {
    console.error("Verify password error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

module.exports = {
  login,
  changePassword,
  verifyPassword,
};
