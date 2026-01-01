const prisma = require("../config/db");
const { sendSuccess, sendError } = require("../utils/response.util");

const createBranch = async (req, res) => {
  try {
    const { name, code, address, taxNumber } = req.body;

    if (!name || !code || !address || !taxNumber) {
      return sendError(res, "All fields are required", 400);
    }

    const existingBranch = await prisma.branch.findUnique({
      where: { code },
    });

    if (existingBranch) {
      return sendError(res, "Branch code already exists", 400);
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        code,
        address,
        taxNumber,
      },
    });

    return sendSuccess(res, branch, 201, "Branch created successfully");
  } catch (error) {
    console.error("Create branch error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

const getAllBranches = async (req, res) => {
  try {
    const { includeArchived } = req.query;
    const where = {};

    // Filter out archived branches by default
    if (!includeArchived || includeArchived === "false") {
      where.isActive = true;
    }

    const branches = await prisma.branch.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return sendSuccess(res, branches);
  } catch (error) {
    console.error("Get branches error:", error);
    return sendError(res, "Failed to fetch branches", 500, error);
  }
};

const searchBranches = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === "") {
      return sendSuccess(res, []);
    }

    const searchTerm = q.trim().toLowerCase();

    const branches = await prisma.branch.findMany({
      where: {
        isActive: true, // Only search active branches
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { code: { contains: searchTerm, mode: "insensitive" } },
          { address: { contains: searchTerm, mode: "insensitive" } },
        ],
      },
      orderBy: { name: "asc" },
    });

    return sendSuccess(res, branches);
  } catch (error) {
    console.error("Search branches error:", error);
    return sendError(res, "Failed to search branches", 500, error);
  }
};

const getBranchById = async (req, res) => {
  try {
    const { id } = req.params;

    const branch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!branch) {
      return sendError(res, "Branch not found", 404);
    }

    return sendSuccess(res, branch);
  } catch (error) {
    console.error("Get branch by ID error:", error);
    return sendError(res, "Failed to fetch branch", 500, error);
  }
};

const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, address, taxNumber } = req.body;

    if (!name || !code || !address || !taxNumber) {
      return sendError(res, "All fields are required", 400);
    }

    // Check if branch exists
    const existingBranch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!existingBranch) {
      return sendError(res, "Branch not found", 404);
    }

    // Check if code is being changed and if new code already exists
    if (code !== existingBranch.code) {
      const codeExists = await prisma.branch.findUnique({
        where: { code },
      });

      if (codeExists) {
        return sendError(res, "Branch code already exists", 400);
      }
    }

    const updatedBranch = await prisma.branch.update({
      where: { id },
      data: {
        name,
        code,
        address,
        taxNumber,
      },
    });

    return sendSuccess(res, updatedBranch, 200, "Branch updated successfully");
  } catch (error) {
    console.error("Update branch error:", error);
    return sendError(res, "Failed to update branch", 500, error);
  }
};

const archiveBranch = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if branch exists
    const existingBranch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!existingBranch) {
      return sendError(res, "Branch not found", 404);
    }

    // Check if branch has active appointments
    const activeAppointments = await prisma.appointment.findFirst({
      where: {
        branchId: id,
        status: { in: ["PENDING", "IN_PROGRESS"] },
      },
    });

    if (activeAppointments) {
      return sendError(
        res,
        "Cannot archive branch with active appointments. Please complete or cancel appointments first.",
        400
      );
    }

    const archivedBranch = await prisma.branch.update({
      where: { id },
      data: { isActive: false },
    });

    return sendSuccess(
      res,
      archivedBranch,
      200,
      "Branch archived successfully"
    );
  } catch (error) {
    console.error("Archive branch error:", error);
    return sendError(res, "Failed to archive branch", 500, error);
  }
};

const restoreBranch = async (req, res) => {
  try {
    const { id } = req.params;

    const existingBranch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!existingBranch) {
      return sendError(res, "Branch not found", 404);
    }

    const restoredBranch = await prisma.branch.update({
      where: { id },
      data: { isActive: true },
    });

    return sendSuccess(
      res,
      restoredBranch,
      200,
      "Branch restored successfully"
    );
  } catch (error) {
    console.error("Restore branch error:", error);
    return sendError(res, "Failed to restore branch", 500, error);
  }
};

module.exports = {
  createBranch,
  getAllBranches,
  searchBranches,
  getBranchById,
  updateBranch,
  archiveBranch,
  restoreBranch,
};
