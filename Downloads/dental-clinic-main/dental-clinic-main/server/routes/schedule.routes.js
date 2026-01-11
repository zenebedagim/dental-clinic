const express = require("express");
const router = express.Router();
const {
  createOrUpdateSchedule,
  getSchedules,
  updateSchedule,
  deleteSchedule,
  createAvailability,
  getAvailabilities,
  deleteAvailability,
  checkDoctorAvailability,
} = require("../controllers/schedule.controller");
const authMiddleware = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");
const {
  validateCreateSchedule,
  validateUpdateSchedule,
  validateCreateAvailability,
  validateScheduleId,
  validateAvailabilityId,
  validateScheduleQuery,
} = require("../validators/schedule.validator");

// Check availability (public endpoint for frontend)
router.get("/check", authMiddleware, validateScheduleQuery, validate, checkDoctorAvailability);

// Schedule routes
router.post("/", authMiddleware, checkRole("RECEPTION", "DENTIST"), validateCreateSchedule, validate, createOrUpdateSchedule);
router.get("/", authMiddleware, checkRole("RECEPTION", "DENTIST"), validateScheduleQuery, validate, getSchedules);
router.put("/:id", authMiddleware, checkRole("RECEPTION", "DENTIST"), validateUpdateSchedule, validate, updateSchedule);
router.delete("/:id", authMiddleware, checkRole("RECEPTION", "DENTIST"), validateScheduleId, validate, deleteSchedule);

// Availability override routes
router.post("/availability", authMiddleware, checkRole("RECEPTION", "DENTIST"), validateCreateAvailability, validate, createAvailability);
router.get("/availability", authMiddleware, checkRole("RECEPTION", "DENTIST"), validateScheduleQuery, validate, getAvailabilities);
router.delete("/availability/:id", authMiddleware, checkRole("RECEPTION", "DENTIST"), validateAvailabilityId, validate, deleteAvailability);

module.exports = router;

