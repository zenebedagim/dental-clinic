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
    .notEmpty()
    .withMessage("Patient ID is required")
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
    .custom((value) => {
      if (!value || value.trim().length === 0) {
        return true; // Optional field
      }
      // Ethiopia phone validation: 09XXXXXXXX (9 digits after 0) or +2519XXXXXXXX
      const digitsOnly = value.replace(/\D/g, "");
      // Remove leading 0 or +251
      const clean = digitsOnly.replace(/^0|^251/, "");
      // Must be 9 digits starting with 9
      if (clean.length === 9 && clean.startsWith("9")) {
        return true;
      }
      throw new Error(
        "Ethiopian phone number must be 9 digits starting with 9 (e.g., 0912345678)"
      );
    }),
  body("address")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Address must be less than 500 characters"),
  body("dateOfBirth")
    .optional()
    .isISO8601()
    .withMessage("Invalid date of birth format. Use ISO 8601 format"),
  // patientId is now required (validated above), so no need for custom validation
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
  body("patientId")
    .optional()
    .isUUID()
    .withMessage("Invalid patient ID format"),
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
  query("dateFrom")
    .optional()
    .isISO8601()
    .withMessage("Invalid dateFrom format. Use ISO 8601 format"),
  query("dateTo")
    .optional()
    .isISO8601()
    .withMessage("Invalid dateTo format. Use ISO 8601 format"),
  query("treatmentStatus")
    .optional()
    .isIn(["IN_PROGRESS", "COMPLETED", "PENDING"])
    .withMessage(
      "Invalid treatment status. Must be IN_PROGRESS, COMPLETED, or PENDING"
    ),
  query("completedToday")
    .optional()
    .isIn(["true", "false"])
    .withMessage("completedToday must be 'true' or 'false'"),
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
  query("sortBy")
    .optional()
    .trim()
    .isIn(["date", "createdAt", "patientName"])
    .withMessage("sortBy must be one of: date, createdAt, patientName"),
  query("orderBy")
    .optional()
    .trim()
    .isIn(["asc", "desc"])
    .withMessage("orderBy must be 'asc' or 'desc'"),
];

module.exports = {
  validateCreateAppointment,
  validateUpdateAppointment,
  validateAppointmentId,
  validateBranchIdQuery,
  validateReceptionAppointmentsQuery,
};
