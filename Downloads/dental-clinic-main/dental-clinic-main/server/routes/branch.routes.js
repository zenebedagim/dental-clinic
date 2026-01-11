const express = require("express");
const router = express.Router();
const {
  createBranch,
  getAllBranches,
  searchBranches,
  getBranchById,
  updateBranch,
  archiveBranch,
  restoreBranch,
} = require("../controllers/branch.controller");
const authMiddleware = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");
const {
  validateCreateBranch,
  validateUpdateBranch,
  validateBranchId,
  validateBranchSearch,
} = require("../validators/branch.validator");

router.post(
  "/",
  authMiddleware,
  checkRole("ADMIN", "RECEPTION", "DENTIST", "XRAY"),
  validateCreateBranch,
  validate,
  createBranch
);
router.get("/", getAllBranches);
router.get("/search", validateBranchSearch, validate, searchBranches);
router.get("/:id", validateBranchId, validate, getBranchById);
router.put(
  "/:id",
  authMiddleware,
  checkRole("ADMIN", "RECEPTION", "DENTIST", "XRAY"),
  validateUpdateBranch,
  validate,
  updateBranch
);
router.patch(
  "/:id/archive",
  authMiddleware,
  checkRole("ADMIN", "RECEPTION", "DENTIST", "XRAY"),
  validateBranchId,
  validate,
  archiveBranch
);
router.patch(
  "/:id/restore",
  authMiddleware,
  checkRole("ADMIN", "RECEPTION", "DENTIST", "XRAY"),
  validateBranchId,
  validate,
  restoreBranch
);


module.exports = router;
