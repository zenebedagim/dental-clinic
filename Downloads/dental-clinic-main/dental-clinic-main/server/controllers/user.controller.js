const prisma = require("../config/db");
const bcrypt = require("bcryptjs");
const { sendSuccess, sendError } = require("../utils/response.util");
const auditService = require("../services/audit.service");
const { encryptPassword, decryptPassword } = require("../utils/crypto.util");
const { broadcastToRoom } = require("../socket/socketServer");

const getAllUsers = async (req, res) => {
  try {
    const { branchId, role } = req.query;
    const { role: userRole } = req.user;
    const isAdmin = userRole === "ADMIN";

    const where = {};
    
    // Admin can see all users, others filter by branch
    if (!isAdmin && req.user.branchId) {
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
        createdBy: true,
        passwordChanged: true,
        passwordChangedBy: true,
        passwordChangedAt: true,
        passwordChangedByUserFlag: true,
        adminVisiblePassword: isAdmin ? true : false, // Only include for admin
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        passwordChangedByUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Map email to phone and decrypt passwords for admin view
    const usersWithPhone = users.map(user => {
      const baseUser = {
        ...user,
        phone: /^[0-9]{10,15}$/.test(user.email) ? user.email : null, // If email is a phone number, use it as phone
      };
      
      // Only decrypt password for admin users
      if (isAdmin && user.adminVisiblePassword) {
        const decryptedPassword = decryptPassword(user.adminVisiblePassword);
        // Determine who changed the password: if passwordChangedByUserFlag is true, user changed it; otherwise admin changed it
        const changedByUserName = user.passwordChangedByUserFlag === true 
          ? (user.passwordChangedByUser?.name || baseUser.name || "User")
          : (user.passwordChangedByUser?.name || "Admin");
        const changedByRole = user.passwordChangedByUserFlag === true
          ? (user.passwordChangedByUser?.role || user.role || "USER")
          : (user.passwordChangedByUser?.role || "ADMIN");
        return {
          ...baseUser,
          plainPassword: decryptedPassword,
          changedByUserName,
          changedByRole,
          createdByName: user.createdByUser?.name || "System",
        };
      }
      
      // Non-admin users don't see passwords
      return baseUser;
    });

    return sendSuccess(res, usersWithPhone);
  } catch (error) {
    console.error("Get users error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { role: userRole } = req.user;
    const isAdmin = userRole === "ADMIN";

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
        createdBy: true,
        passwordChanged: true,
        passwordChangedBy: true,
        passwordChangedAt: true,
        passwordChangedByUserFlag: true,
        adminVisiblePassword: isAdmin ? true : false, // Only include for admin
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        passwordChangedByUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    if (!user) {
      return sendError(res, "User not found", 404);
    }

    // Map email to phone for frontend compatibility
    const userWithPhone = {
      ...user,
      phone: /^[0-9]{10,15}$/.test(user.email) ? user.email : null, // If email is a phone number, use it as phone
    };
    
    // Only decrypt password for admin users
    if (isAdmin && user.adminVisiblePassword) {
      const decryptedPassword = decryptPassword(user.adminVisiblePassword);
      userWithPhone.plainPassword = decryptedPassword;
      // Determine who changed the password: if passwordChangedByUserFlag is true, user changed it; otherwise admin changed it
      userWithPhone.changedByUserName = user.passwordChangedByUserFlag === true 
        ? (user.passwordChangedByUser?.name || user.name || "User")
        : (user.passwordChangedByUser?.name || "Admin");
      userWithPhone.changedByRole = user.passwordChangedByUserFlag === true
        ? (user.passwordChangedByUser?.role || user.role || "USER")
        : (user.passwordChangedByUser?.role || "ADMIN");
      userWithPhone.createdByName = user.createdByUser?.name || "System";
    }

    return sendSuccess(res, userWithPhone);
  } catch (error) {
    console.error("Get user by ID error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

// Admin-only: Create user
const createUser = async (req, res) => {
  try {
    const { id: adminId, branchId: adminBranchId } = req.user;
    const { name, phone, email, password, role, branchId, specialization } = req.body;

    // Use phone if provided, otherwise fall back to email (for backward compatibility)
    const identifier = phone || email;
    if (!name || !identifier || !password || !role || !branchId) {
      return sendError(res, "Name, phone/email, password, role, and branch are required", 400);
    }

    // Validate role
    const validRoles = ["ADMIN", "RECEPTION", "DENTIST", "XRAY"];
    if (!validRoles.includes(role)) {
      return sendError(res, "Invalid role", 400);
    }

    // Validate phone format if phone is provided
    if (phone && !/^[0-9]{10,15}$/.test(phone.replace(/\s+/g, ""))) {
      return sendError(res, "Invalid phone number format (10-15 digits required)", 400);
    }

    // Use phone as email identifier (store phone in email field for now)
    // This allows us to use phone without schema migration
    const emailValue = phone ? phone.replace(/\s+/g, "") : email.toLowerCase().trim();

    // Check if identifier already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: emailValue },
    });

    if (existingUser) {
      return sendError(res, "User with this phone/email already exists", 400);
    }

    // Verify branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      return sendError(res, "Branch not found", 404);
    }

    // Hash password with bcrypt for authentication
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Encrypt plaintext password with AES for admin visibility
    const encryptedPassword = encryptPassword(password);
    
    // Get current timestamp for password change tracking
    const now = new Date();

    // Create user
    // Store phone in email field (for backward compatibility with existing schema)
    const user = await prisma.user.create({
      data: {
        name,
        email: emailValue,
        password: hashedPassword,
        adminVisiblePassword: encryptedPassword, // AES-encrypted plaintext
        role,
        branchId,
        specialization: role === "DENTIST" ? specialization : null,
        createdBy: adminId, // Admin who created the user
        passwordChanged: false, // User hasn't changed password yet
        passwordChangedBy: adminId, // Admin set the initial password
        passwordChangedAt: now, // Timestamp when password was set
        passwordChangedByUserFlag: false, // Password was set by admin, not user
      },
      select: {
        id: true,
        name: true,
        email: true, // This contains phone if phone was provided
        role: true,
        branchId: true,
        specialization: true,
        createdAt: true,
        createdBy: true,
        passwordChanged: true,
        passwordChangedBy: true,
        passwordChangedAt: true,
        passwordChangedByUserFlag: true,
        adminVisiblePassword: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        passwordChangedByUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    // Decrypt password for admin response (admin needs to see it)
    const decryptedPassword = decryptPassword(user.adminVisiblePassword);

    // Map email to phone for frontend compatibility
    const userWithPhone = {
      ...user,
      phone: /^[0-9]{10,15}$/.test(user.email) ? user.email : null,
      plainPassword: decryptedPassword, // Decrypted password for admin view
      changedByUserName: user.passwordChangedByUser?.name || "Admin",
      changedByRole: user.passwordChangedByUser?.role || "ADMIN",
    };

    // Log audit action
    await auditService.logAction(
      adminId,
      "CREATE",
      "User",
      user.id,
      null,
      { name, phone: phone || email, role, branchId, specialization },
      req,
      branchId
    );

    // Emit WebSocket event to admin room for real-time update
    try {
      // Broadcast to all admin users across all branches
      // Using pattern matching for "role:ADMIN" which should match "role:ADMIN:branch:*" rooms
      broadcastToRoom("role:ADMIN", "user_created", {
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        createdBy: adminId,
        timestamp: now.toISOString(),
      });
    } catch (err) {
      console.error("Error emitting user_created event:", err);
    }

    return sendSuccess(res, userWithPhone, 201, "User created successfully");
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
    const { name, phone, email, password, role, branchId, specialization } = req.body;

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

    // Handle phone/email update
    // Use phone if provided, otherwise use email (for backward compatibility)
    let emailValue = existingUser.email;
    if (phone) {
      // Validate phone format
      if (!/^[0-9]{10,15}$/.test(phone.replace(/\s+/g, ""))) {
        return sendError(res, "Invalid phone number format (10-15 digits required)", 400);
      }
      emailValue = phone.replace(/\s+/g, "");
    } else if (email) {
      emailValue = email.toLowerCase().trim();
    }

    // Check uniqueness if identifier is being changed
    if (emailValue !== existingUser.email) {
      const identifierExists = await prisma.user.findUnique({
        where: { email: emailValue },
      });

      if (identifierExists) {
        return sendError(res, "User with this phone/email already exists", 400);
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
    // Update email field with phone if provided, or email if provided
    if (phone || email) {
      updateData.email = emailValue;
    }
    
    let newPasswordPlain = null; // Store plaintext password for WebSocket event
    
    if (password) {
      // Hash password with bcrypt for authentication
      updateData.password = await bcrypt.hash(password, 10);
      
      // Encrypt plaintext password with AES for admin visibility
      updateData.adminVisiblePassword = encryptPassword(password);
      
      // Update password tracking fields
      const now = new Date();
      updateData.passwordChangedBy = adminId; // Admin changed the password
      updateData.passwordChangedAt = now;
      updateData.passwordChangedByUserFlag = false; // Password changed by admin
      
      // Store plaintext for WebSocket event (admin needs to see it)
      newPasswordPlain = password;
    }
    
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
        createdBy: true,
        passwordChanged: true,
        passwordChangedBy: true,
        passwordChangedAt: true,
        passwordChangedByUserFlag: true,
        adminVisiblePassword: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
        passwordChangedByUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    // Decrypt password for admin response if password was changed
    let decryptedPassword = null;
    if (updatedUser.adminVisiblePassword) {
      decryptedPassword = decryptPassword(updatedUser.adminVisiblePassword);
    }

    // Map email to phone for frontend compatibility
    const userWithPhone = {
      ...updatedUser,
      phone: /^[0-9]{10,15}$/.test(updatedUser.email) ? updatedUser.email : null,
    };
    
    // Add password metadata for admin view
    if (decryptedPassword) {
      userWithPhone.plainPassword = decryptedPassword;
      userWithPhone.changedByUserName = updatedUser.passwordChangedByUser?.name || "Admin";
      userWithPhone.changedByRole = updatedUser.passwordChangedByUser?.role || "ADMIN";
      userWithPhone.createdByName = updatedUser.createdByUser?.name || "System";
    }
    
    // Emit WebSocket event for real-time password sync (only if password was changed)
    if (password && newPasswordPlain) {
      try {
        broadcastToRoom("role:ADMIN", "password_changed", {
          userId: id,
          newPassword: newPasswordPlain, // Decrypted password for admin view
          changedBy: "admin",
          changedByUserId: adminId,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error("Error emitting password change event:", err);
      }
    }

    // Log audit action (include phone in audit log)
    const auditData = { ...updateData };
    if (phone) auditData.phone = phone;
    await auditService.logAction(
      adminId,
      "UPDATE",
      "User",
      id,
      existingUser,
      auditData,
      req,
      updatedUser.branchId
    );

    return sendSuccess(res, userWithPhone, 200, "User updated successfully");
  } catch (error) {
    console.error("Update user error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

// Admin-only: Change user password
const changeUserPassword = async (req, res) => {
  try {
    const { id: adminId } = req.user;
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.trim().length < 6) {
      return sendError(res, "New password is required and must be at least 6 characters", 400);
    }

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
      },
    });

    if (!existingUser) {
      return sendError(res, "User not found", 404);
    }

    // Hash password with bcrypt for authentication
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
    
    // Encrypt plaintext password with AES for admin visibility
    const encryptedPassword = encryptPassword(newPassword.trim());
    
    // Get current timestamp for password change tracking
    const now = new Date();

    // Update user password
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
        adminVisiblePassword: encryptedPassword,
        passwordChangedBy: adminId, // Admin changed the password
        passwordChangedAt: now,
        passwordChangedByUserFlag: false, // Password changed by admin
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
        adminVisiblePassword: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        passwordChangedByUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });

    // Decrypt password for admin response
    const decryptedPassword = decryptPassword(updatedUser.adminVisiblePassword);

    // Map email to phone for frontend compatibility
    const userWithPhone = {
      ...updatedUser,
      phone: /^[0-9]{10,15}$/.test(updatedUser.email) ? updatedUser.email : null,
      plainPassword: decryptedPassword, // Decrypted password for admin view
      changedByUserName: updatedUser.passwordChangedByUser?.name || "Admin",
      changedByRole: updatedUser.passwordChangedByUser?.role || "ADMIN",
    };

    // Log audit action
    await auditService.logAction(
      adminId,
      "UPDATE",
      "User",
      id,
      existingUser,
      { passwordChanged: true, changedBy: "admin" },
      req,
      updatedUser.branchId
    );

    // Emit WebSocket event to admin room for real-time update
    try {
      broadcastToRoom("role:ADMIN", "password_changed", {
        userId: id,
        newPassword: newPassword.trim(), // Decrypted password for admin view
        changedBy: "admin",
        changedByUserId: adminId,
        timestamp: now.toISOString(),
      });
    } catch (err) {
      console.error("Error emitting password change event:", err);
    }

    return sendSuccess(res, userWithPhone, 200, "Password changed successfully");
  } catch (error) {
    console.error("Change user password error:", error);
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
  changeUserPassword,
  deleteUser,
  resetUserPassword,
  getUserActivityLog,
};
