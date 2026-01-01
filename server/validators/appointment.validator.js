/**
 * Appointment Validation Rules
 * Using express-validator for input validation
 */

const { body, param, query } = require("express-validator");

/**
 * Validation rules for creating an appointment
 */
const validateCreateAppointment = [
  body("patientId")
    .optional()
    .isUUID()
    .withMessage("Invalid patient ID format"),
  body("patientName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Patient name cannot be empty if provided")
    .isLength({ min: 2, max: 100 })
    .withMessage("Patient name must be between 2 and 100 characters"),
  body("gender")
    .optional()
    .isIn(["Male", "Female", "Other"])
    .withMessage("Gender must be Male, Female, or Other"),
  body("phoneNumber")
    .optional()
    .trim()
    .isLength({ min: 0, max: 20 })
    .withMessage("Phone number must be less than 20 characters"),
  body("address")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address must be less than 500 characters"),
  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Invalid date of birth format. Use ISO 8601 format"),
  body("patientId").custom((value, { req }) => {
    // Require either patientId or patientName
    if (!value && !req.body.patientName) {
      throw new Error("Either patient ID or patient name is required");
    }
    return true;
  }),
  body("branchId").isUUID().withMessage("Invalid branch ID format"),
  body("dentistId").isUUID().withMessage("Invalid dentist ID format"),
  body("xrayId")
    .optional()
    .isUUID()
    .withMessage("Invalid X-Ray doctor ID format"),
  body("date")
    .notEmpty()
    .withMessage("Date is required")
    .isISO8601()
    .withMessage(
      "Invalid date format. Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss)"
    ),
  body("date").custom((value) => {
    const appointmentDate = new Date(value);
    const now = new Date();
    if (appointmentDate < now) {
      throw new Error("Appointment date cannot be in the past");
    }
    return true;
  }),
  body("visitReason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Visit reason must be less than 500 characters"),
];

/**
 * Validation rules for updating an appointment
 */
const validateUpdateAppointment = [
  param("id").isUUID().withMessage("Invalid appointment ID format"),
  body("patientName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Patient name cannot be empty")
    .isLength({ min: 2, max: 100 })
    .withMessage("Patient name must be between 2 and 100 characters"),
  body("branchId").optional().isUUID().withMessage("Invalid branch ID format"),
  body("dentistId")
    .optional()
    .isUUID()
    .withMessage("Invalid dentist ID format"),
  body("xrayId")
    .optional()
    .isUUID()
    .withMessage("Invalid X-Ray doctor ID format"),
  body("date")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format. Use ISO 8601 format"),
  body("status")
    .optional()
    .isIn(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"])
    .withMessage("Invalid appointment status"),
  body("visitReason")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Visit reason must be less than 500 characters"),
];

/**
 * Validation rules for appointment ID parameter
 */
const validateAppointmentId = [
  param("id").isUUID().withMessage("Invalid appointment ID format"),
];

/**
 * Validation rules for branch ID query parameter
 */
const validateBranchIdQuery = [
  query("branchId").optional().isUUID().withMessage("Invalid branch ID format"),
];

/**
 * Validation rules for reception appointments query
 */
const validateReceptionAppointmentsQuery = [
  query("branchId").optional().isUUID().withMessage("Invalid branch ID format"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid date"),
  query("status")
    .optional()
    .isIn(["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ALL"])
    .withMessage("Invalid appointment status"),
  query("dentistId")
    .optional()
    .isUUID()
    .withMessage("Invalid dentist ID format"),
  query("patientName")
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage("Patient name must be at least 1 character"),
  query("patientPhone")
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage("Patient phone must be at least 1 character"),
];

module.exports = {
  validateCreateAppointment,
  validateUpdateAppointment,
  validateAppointmentId,
  validateBranchIdQuery,
  validateReceptionAppointmentsQuery,
};
