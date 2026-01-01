const express = require("express");
const router = express.Router();
const {
  createPayment,
  updatePayment,
  getPayments,
  getPaymentByAppointment,
  toggleDetailedBilling,
} = require("../controllers/payment.controller");
const authMiddleware = require("../middleware/auth.middleware");
const checkRole = require("../middleware/role.middleware");
const validate = require("../middleware/validate.middleware");
const {
  validateCreatePayment,
  validateUpdatePayment,
  validatePaymentId,
  validateAppointmentIdParam,
  validatePaymentQuery,
  validateToggleDetailedBilling,
} = require("../validators/payment.validator");

router.post(
  "/",
  authMiddleware,
  checkRole("RECEPTION"),
  validateCreatePayment,
  validate,
  createPayment
);

router.put(
  "/:id",
  authMiddleware,
  checkRole("RECEPTION"),
  validateUpdatePayment,
  validate,
  updatePayment
);

router.get(
  "/",
  authMiddleware,
  checkRole("RECEPTION"),
  validatePaymentQuery,
  validate,
  getPayments
);

router.get(
  "/appointment/:appointmentId",
  authMiddleware,
  checkRole("RECEPTION"),
  validateAppointmentIdParam,
  validate,
  getPaymentByAppointment
);

router.put(
  "/:id/toggle-detailed-billing",
  authMiddleware,
  checkRole("DENTIST"),
  validateToggleDetailedBilling,
  validate,
  toggleDetailedBilling
);

module.exports = router;
