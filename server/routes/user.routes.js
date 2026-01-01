const express = require("express");
const router = express.Router();
const { getAllUsers } = require("../controllers/user.controller");
const authMiddleware = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");
const { validateUserQuery } = require("../validators/user.validator");

router.get(
  "/",
  authMiddleware,
  checkRole("ADMIN", "RECEPTION", "DENTIST", "XRAY"),
  validateUserQuery,
  validate,
  getAllUsers
);

module.exports = router;
