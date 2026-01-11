const express = require("express");
const router = express.Router();
const {
  createPatient,
  getAllPatients,
  searchPatients,
  getPatientById,
  updatePatient,
  deletePatient,
} = require("../controllers/patient.controller");
const authMiddleware = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");
const {
  validateCreatePatient,
  validateUpdatePatient,
  validatePatientId,
  validatePatientSearch,
} = require("../validators/patient.validator");
const { searchRateLimiter } = require("../middleware/rateLimiter");

// Search patients (for autocomplete) - available to all authenticated users
router.get(
  "/search",
  authMiddleware,
  searchRateLimiter, // Apply rate limiting to search
  validatePatientSearch,
  validate,
  searchPatients
);

// Get all patients with filtering
router.get(
  "/",
  authMiddleware,
  checkRole("ADMIN", "RECEPTION", "DENTIST", "XRAY"),
  // Temporarily removed validation to debug - will add back if needed
  // validatePatientSearch,
  // validate,
  getAllPatients
);

// Get patient by ID
router.get(
  "/:id",
  authMiddleware,
  checkRole("ADMIN", "RECEPTION", "DENTIST", "XRAY"),
  validatePatientId,
  validate,
  getPatientById
);

// Create new patient
router.post(
  "/",
  authMiddleware,
  checkRole("RECEPTION"),
  validateCreatePatient,
  validate,
  createPatient
);

// Update patient
router.put(
  "/:id",
  authMiddleware,
  checkRole("RECEPTION"),
  validateUpdatePatient,
  validate,
  updatePatient
);

// Delete patient
router.delete(
  "/:id",
  authMiddleware,
  checkRole("RECEPTION"),
  validatePatientId,
  validate,
  deletePatient
);

module.exports = router;
