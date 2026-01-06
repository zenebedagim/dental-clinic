const express = require("express");
const router = express.Router();
const { login, register } = require("../controllers/auth.controller");
const authMiddleware = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");
const { authRateLimiter } = require("../middleware/rateLimiter");

// Apply strict rate limiting to authentication endpoints
router.post("/login", authRateLimiter, login);
router.post("/register", authMiddleware, authRateLimiter, register);

module.exports = router;
