const express = require("express");
const router = express.Router();
const {
  createPayment,
  updatePayment,
  getPayments,
  getPaymentById,
  getPaymentByAppointment,
  toggleDetailedBilling,
  getPaymentStats,
  generateReceipt,
  deletePayment,
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
  checkRole("RECEPTION", "DENTIST"),
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
  checkRole("RECEPTION", "DENTIST"),
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

router.get(
  "/stats",
  authMiddleware,
  checkRole("ADMIN", "RECEPTION"),
  getPaymentStats
);

router.get(
  "/:id/receipt",
  authMiddleware,
  checkRole("ADMIN", "RECEPTION", "DENTIST"),
  validatePaymentId,
  validate,
  generateReceipt
);

router.get(
  "/:id",
  authMiddleware,
  checkRole("RECEPTION", "DENTIST"),
  validatePaymentId,
  validate,
  getPaymentById
);

router.put(
  "/:id/toggle-detailed-billing",
  authMiddleware,
  checkRole("DENTIST"),
  validateToggleDetailedBilling,
  validate,
  toggleDetailedBilling
);

router.delete(
  "/:id",
  authMiddleware,
  checkRole("RECEPTION"),
  validatePaymentId,
  validate,
  deletePayment
);

module.exports = router;
