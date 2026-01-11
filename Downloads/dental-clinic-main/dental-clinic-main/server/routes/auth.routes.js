const express = require("express");
const router = express.Router();
const {
  login,
  changePassword,
  verifyPassword,
} = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");
const { authRateLimiter } = require("../middleware/rateLimiter");
const validate = require("../middleware/validate.middleware");
const { validateLogin } = require("../validators/auth.validator");

// Public login route (before auth middleware)
router.post("/login", authRateLimiter, validateLogin, validate, login);

// Password management routes (require authentication)
router.post("/change-password", authMiddleware, changePassword);
router.post("/verify-password", authMiddleware, verifyPassword);

module.exports = router;
