const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
  getUserActivityLog,
} = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");
const { validateUserQuery } = require("../validators/user.validator");

// General route for all roles
router.get(
  "/",
  authMiddleware,
  checkRole("ADMIN", "RECEPTION", "DENTIST", "XRAY"),
  validateUserQuery,
  validate,
  getAllUsers
);

// Get user by ID
router.get(
  "/:id",
  authMiddleware,
  checkRole("ADMIN", "RECEPTION", "DENTIST", "XRAY"),
  getUserById
);

// Admin-only routes
router.post(
  "/",
  authMiddleware,
  checkRole("ADMIN"),
  createUser
);

router.put(
  "/:id",
  authMiddleware,
  checkRole("ADMIN"),
  updateUser
);

router.delete(
  "/:id",
  authMiddleware,
  checkRole("ADMIN"),
  deleteUser
);

router.patch(
  "/:id/reset-password",
  authMiddleware,
  checkRole("ADMIN"),
  resetUserPassword
);

router.get(
  "/:id/activity",
  authMiddleware,
  checkRole("ADMIN"),
  getUserActivityLog
);

module.exports = router;
