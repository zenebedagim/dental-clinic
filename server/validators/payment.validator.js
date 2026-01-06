const { body, query, param } = require("express-validator");

const validateCreatePayment = [
  body("appointmentId")
    .notEmpty()
    .withMessage("Appointment ID is required")
    .isUUID()
    .withMessage("Invalid appointment ID format"),
  body("amount")
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (value === null || value === undefined || value === "") return true;
      const num = parseFloat(value);
      return !isNaN(num) && num >= 0;
    })
    .withMessage("Amount must be a positive number"),
  body("paidAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Paid amount must be a positive number"),
  body("paymentStatus")
    .optional()
    .isIn(["PAID", "PARTIAL", "UNPAID"])
    .withMessage("Payment status must be PAID, PARTIAL, or UNPAID"),
  body("paymentMethod")
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      return typeof value === "string";
    })
    .withMessage("Payment method must be a string or null"),
  body("notes").optional({ nullable: true, checkFalsy: true }).isString().withMessage("Notes must be a string"),
  body("isHidden")
    .optional()
    .isBoolean()
    .withMessage("isHidden must be a boolean value"),
];

const validateUpdatePayment = [
  param("id")
    .notEmpty()
    .withMessage("Payment ID is required")
    .isUUID()
    .withMessage("Invalid payment ID format"),
  body("amount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Amount must be a positive number"),
  body("paidAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Paid amount must be a positive number"),
  body("paymentStatus")
    .optional()
    .isIn(["PAID", "PARTIAL", "UNPAID"])
    .withMessage("Payment status must be PAID, PARTIAL, or UNPAID"),
  body("paymentMethod")
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      if (value === null || value === undefined) return true;
      return typeof value === "string";
    })
    .withMessage("Payment method must be a string or null"),
  body("notes").optional({ nullable: true, checkFalsy: true }).isString().withMessage("Notes must be a string"),
  body("paymentDate")
    .optional()
    .isISO8601()
    .withMessage("Payment date must be a valid date"),
];

const validatePaymentId = [
  param("id")
    .notEmpty()
    .withMessage("Payment ID is required")
    .isUUID()
    .withMessage("Invalid payment ID format"),
];

const validateAppointmentIdParam = [
  param("appointmentId")
    .notEmpty()
    .withMessage("Appointment ID is required")
    .isUUID()
    .withMessage("Invalid appointment ID format"),
];

const validatePaymentQuery = [
  query("branchId").optional().isUUID().withMessage("Invalid branch ID format"),
  query("status")
    .optional()
    .isIn(["PAID", "PARTIAL", "UNPAID"])
    .withMessage("Status must be PAID, PARTIAL, or UNPAID"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid date"),
  query("minAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Minimum amount must be a positive number"),
  query("maxAmount")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Maximum amount must be a positive number"),
  query("dentistId")
    .optional()
    .isUUID()
    .withMessage("Invalid dentist ID format"),
  query("isHidden")
    .optional()
    .custom((value) => {
      if (value === "true" || value === "false" || value === true || value === false) {
        return true;
      }
      throw new Error("isHidden must be 'true' or 'false'");
    })
    .withMessage("isHidden must be 'true' or 'false'"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Limit must be between 1 and 1000"),
  query("skip")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Skip must be a non-negative integer"),
];

const validateToggleDetailedBilling = [
  param("id")
    .notEmpty()
    .withMessage("Payment ID is required")
    .isUUID()
    .withMessage("Invalid payment ID format"),
  body("enabled")
    .notEmpty()
    .withMessage("Enabled status is required")
    .isBoolean()
    .withMessage("Enabled must be a boolean value"),
];

module.exports = {
  validateCreatePayment,
  validateUpdatePayment,
  validatePaymentId,
  validateAppointmentIdParam,
  validatePaymentQuery,
  validateToggleDetailedBilling,
};

