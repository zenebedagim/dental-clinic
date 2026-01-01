const prisma = require("../config/db");
const { sendSuccess, sendError } = require("../utils/response.util");

const getAllUsers = async (req, res) => {
  try {
    const { branchId, role } = req.query;

    const where = {};
    if (branchId) {
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

module.exports = { getAllUsers };
