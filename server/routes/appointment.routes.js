const express = require("express");
const router = express.Router();
const {
  createAppointment,
  getReceptionAppointments,
  getDentistAppointments,
  getXrayAppointments,
  updateAppointment,
  getPatientAppointmentsWithSequence,
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
  checkRole("RECEPTION"),
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
  checkRole("RECEPTION", "DENTIST", "ADMIN"),
  getPatientAppointmentsWithSequence
);

module.exports = router;
