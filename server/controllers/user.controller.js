const prisma = require("../config/db");
const bcrypt = require("bcryptjs");
const { sendSuccess, sendError } = require("../utils/response.util");
const auditService = require("../services/audit.service");

const getAllUsers = async (req, res) => {
  try {
    const { branchId, role } = req.query;
    const { role: userRole } = req.user;

    const where = {};
    
    // Admin can see all users, others filter by branch
    if (userRole !== "ADMIN" && req.user.branchId) {
      where.branchId = req.user.branchId;
    } else if (branchId) {
      where.branchId = branchId;
    }
    
    if (role) {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        specialization: true,
        createdAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return sendSuccess(res, users);
  } catch (error) {
    console.error("Get users error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        specialization: true,
        createdAt: true,
        updatedAt: true,
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
      return sendError(res, "User not found", 404);
    }

    return sendSuccess(res, user);
  } catch (error) {
    console.error("Get user by ID error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

// Admin-only: Create user
const createUser = async (req, res) => {
  try {
    const { id: adminId, branchId: adminBranchId } = req.user;
    const { name, email, password, role, branchId, specialization } = req.body;

    if (!name || !email || !password || !role || !branchId) {
      return sendError(res, "Name, email, password, role, and branch are required", 400);
    }

    // Validate role
    const validRoles = ["ADMIN", "RECEPTION", "DENTIST", "XRAY"];
    if (!validRoles.includes(role)) {
      return sendError(res, "Invalid role", 400);
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return sendError(res, "User with this email already exists", 400);
    }

    // Verify branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      return sendError(res, "Branch not found", 404);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role,
        branchId,
        specialization: role === "DENTIST" ? specialization : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        specialization: true,
        createdAt: true,
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
    await auditService.logAction(
      adminId,
      "CREATE",
      "User",
      user.id,
      null,
      { name, email, role, branchId, specialization },
      req,
      branchId
    );

    return sendSuccess(res, user, 201, "User created successfully");
  } catch (error) {
    console.error("Create user error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

// Admin-only: Update user
const updateUser = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { id } = req.params;
    const { name, email, role, branchId, specialization } = req.body;

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        specialization: true,
      },
    });

    if (!existingUser) {
      return sendError(res, "User not found", 404);
    }

    // Validate role if provided
    if (role) {
      const validRoles = ["ADMIN", "RECEPTION", "DENTIST", "XRAY"];
      if (!validRoles.includes(role)) {
        return sendError(res, "Invalid role", 400);
      }
    }

    // Check email uniqueness if email is being changed
    if (email && email.toLowerCase().trim() !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (emailExists) {
        return sendError(res, "User with this email already exists", 400);
      }
    }

    // Verify branch exists if branchId is provided
    if (branchId && branchId !== existingUser.branchId) {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
      });

      if (!branch) {
        return sendError(res, "Branch not found", 404);
      }
    }

    // Prepare update data
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase().trim();
    if (role) updateData.role = role;
    if (branchId) updateData.branchId = branchId;
    if (specialization !== undefined) {
      updateData.specialization = role === "DENTIST" ? specialization : null;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        specialization: true,
        updatedAt: true,
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
    await auditService.logAction(
      adminId,
      "UPDATE",
      "User",
      id,
      existingUser,
      updateData,
      req,
      updatedUser.branchId
    );

    return sendSuccess(res, updatedUser, 200, "User updated successfully");
  } catch (error) {
    console.error("Update user error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

// Admin-only: Delete user
const deleteUser = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { id } = req.params;

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        _count: {
          select: {
            appointmentsAsDentist: true,
            appointmentsAsReceptionist: true,
            appointmentsAsXray: true,
          },
        },
      },
    });

    if (!existingUser) {
      return sendError(res, "User not found", 404);
    }

    // Check for dependencies
    const hasAppointments =
      existingUser._count.appointmentsAsDentist > 0 ||
      existingUser._count.appointmentsAsReceptionist > 0 ||
      existingUser._count.appointmentsAsXray > 0;

    if (hasAppointments) {
      return sendError(
        res,
        "Cannot delete user with existing appointments. Archive or reassign appointments first.",
        400
      );
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    // Log audit action (don't fail if audit logging fails)
    try {
      await auditService.logAction(
        adminId,
        "DELETE",
        "User",
        id,
        {
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
        },
        null,
        req,
        existingUser.branchId
      );
    } catch (auditError) {
      console.error("Error logging audit action:", auditError);
      // Continue even if audit logging fails
    }

    return sendSuccess(res, null, 200, "User deleted successfully");
  } catch (error) {
    console.error("Delete user error:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    return sendError(res, error.message || "Server error", 500, error);
  }
};

// Admin-only: Reset user password
const resetUserPassword = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return sendError(res, "Password must be at least 6 characters", 400);
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, branchId: true },
    });

    if (!user) {
      return sendError(res, "User not found", 404);
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    // Log audit action
    await auditService.logAction(
      adminId,
      "UPDATE",
      "User",
      id,
      null,
      { passwordChanged: true },
      req,
      user.branchId
    );

    return sendSuccess(res, null, 200, "Password reset successfully");
  } catch (error) {
    console.error("Reset password error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

// Admin-only: Get user activity log
const getUserActivityLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      return sendError(res, "User not found", 404);
    }

    // Get activity logs
    const activity = await auditService.getUserAuditLogs(
      id,
      parseInt(limit),
      parseInt(offset)
    );

    return sendSuccess(res, activity);
  } catch (error) {
    console.error("Get user activity log error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  getUserActivityLog,
};
