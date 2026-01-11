const express = require("express");
const router = express.Router();
const {
  createAppointment,
  getReceptionAppointments,
  getDentistAppointments,
  getXrayAppointments,
  updateAppointment,
  getPatientAppointmentsWithSequence,
  getAppointmentStats,
  rescheduleAppointment,
  checkInAppointment,
  cancelAppointment,
  bulkAppointmentOperations,
} = require("../controllers/appointment.controller");
const authMiddleware = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");
const {
  validateCreateAppointment,
  validateBranchIdQuery,
  validateReceptionAppointmentsQuery,
  validateAppointmentId,
  validateUpdateAppointment,
} = require("../validators/appointment.validator");

router.post(
  "/",
  authMiddleware,
  checkRole("RECEPTION"),
  validateCreateAppointment,
  validate,
  createAppointment
);
router.get(
  "/reception",
  authMiddleware,
  checkRole("ADMIN", "RECEPTION"),
  validateReceptionAppointmentsQuery,
  validate,
  getReceptionAppointments
);
router.get(
  "/dentist",
  authMiddleware,
  checkRole("DENTIST"),
  validateBranchIdQuery,
  validate,
  getDentistAppointments
);
router.get(
  "/xray",
  authMiddleware,
  checkRole("XRAY"),
  validateBranchIdQuery,
  validate,
  getXrayAppointments
);

router.put(
  "/:id",
  authMiddleware,
  checkRole("RECEPTION", "DENTIST"),
  validateUpdateAppointment,
  validate,
  updateAppointment
);

router.get(
  "/patient/:patientId/sequence",
  authMiddleware,
  checkRole("ADMIN", "RECEPTION", "DENTIST"),
  getPatientAppointmentsWithSequence
);

// New endpoints for enhanced features
router.get(
  "/stats",
  authMiddleware,
  checkRole("ADMIN", "RECEPTION"),
  getAppointmentStats
);

router.post(
  "/:id/reschedule",
  authMiddleware,
  checkRole("RECEPTION", "ADMIN"),
  validateAppointmentId,
  validate,
  rescheduleAppointment
);

router.post(
  "/:id/checkin",
  authMiddleware,
  checkRole("RECEPTION", "ADMIN"),
  validateAppointmentId,
  validate,
  checkInAppointment
);

router.post(
  "/:id/cancel",
  authMiddleware,
  checkRole("RECEPTION", "ADMIN"),
  validateAppointmentId,
  validate,
  cancelAppointment
);

router.post(
  "/bulk",
  authMiddleware,
  checkRole("RECEPTION", "ADMIN"),
  bulkAppointmentOperations
);

module.exports = router;
