/**
 * Schedule Validation Rules
 * Using express-validator for input validation
 */

const { body, param, query } = require("express-validator");

/**
 * Validation rules for creating a doctor schedule
 */
const validateCreateSchedule = [
  body("doctorId").isUUID().withMessage("Invalid doctor ID format"),
  body("branchId").isUUID().withMessage("Invalid branch ID format"),
  body("dayOfWeek")
    .isInt({ min: 0, max: 6 })
    .withMessage("Day of week must be between 0 (Sunday) and 6 (Saturday)"),
  body("startTime")
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Start time must be in HH:mm format (e.g., 09:00)"),
  body("endTime")
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("End time must be in HH:mm format (e.g., 17:00)"),
  body("isAvailable").optional().isBoolean().withMessage("isAvailable must be a boolean"),
  body("endTime").custom((value, { req }) => {
    const startTime = req.body.startTime;
    if (startTime && value) {
      const [startHour, startMin] = startTime.split(":").map(Number);
      const [endHour, endMin] = value.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      if (endMinutes <= startMinutes) {
        throw new Error("End time must be after start time");
      }
    }
    return true;
  }),
];

/**
 * Validation rules for updating a doctor schedule
 */
const validateUpdateSchedule = [
  param("id").isUUID().withMessage("Invalid schedule ID format"),
  body("startTime")
    .optional()
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Start time must be in HH:mm format (e.g., 09:00)"),
  body("endTime")
    .optional()
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("End time must be in HH:mm format (e.g., 17:00)"),
  body("isAvailable").optional().isBoolean().withMessage("isAvailable must be a boolean"),
];

/**
 * Validation rules for creating doctor availability override
 */
const validateCreateAvailability = [
  body("doctorId").isUUID().withMessage("Invalid doctor ID format"),
  body("date")
    .notEmpty()
    .withMessage("Date is required")
    .isISO8601()
    .withMessage("Invalid date format. Use ISO 8601 format (YYYY-MM-DD)"),
  body("startTime")
    .optional()
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("Start time must be in HH:mm format"),
  body("endTime")
    .optional()
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage("End time must be in HH:mm format"),
  body("reason").optional().trim().isLength({ max: 200 }).withMessage("Reason must be less than 200 characters"),
  body("isAvailable").optional().isBoolean().withMessage("isAvailable must be a boolean"),
];

/**
 * Validation rules for schedule/availability ID
 */
const validateScheduleId = [param("id").isUUID().withMessage("Invalid schedule ID format")];

/**
 * Validation rules for availability ID
 */
const validateAvailabilityId = [param("id").isUUID().withMessage("Invalid availability ID format")];

/**
 * Validation rules for query parameters
 */
const validateScheduleQuery = [
  query("doctorId").optional().isUUID().withMessage("Invalid doctor ID format"),
  query("branchId").optional().isUUID().withMessage("Invalid branch ID format"),
  query("date")
    .optional()
    .isISO8601()
    .withMessage("Invalid date format. Use ISO 8601 format (YYYY-MM-DD)"),
];

module.exports = {
  validateCreateSchedule,
  validateUpdateSchedule,
  validateCreateAvailability,
  validateScheduleId,
  validateAvailabilityId,
  validateScheduleQuery,
};

