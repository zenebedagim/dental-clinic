/**
 * X-Ray Validation Rules
 * Using express-validator for input validation
 */

const { body, param, query } = require("express-validator");

/**
 * Validation rules for uploading X-Ray result
 */
const validateUploadXrayResult = [
  body("appointmentId")
    .optional()
    .isUUID()
    .withMessage("Invalid appointment ID format"),
  body("result")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("X-Ray result must be less than 5000 characters"),
  body("xrayType")
    .optional()
    .isIn([
      "PANORAMIC",
      "BITEWING",
      "PERIAPICAL",
      "OCCLUSAL",
      "CEPHALOMETRIC",
      "CT_SCAN",
      "CBCT",
    ])
    .withMessage(
      "Invalid X-Ray type. Must be PANORAMIC, BITEWING, PERIAPICAL, OCCLUSAL, CEPHALOMETRIC, CT_SCAN, or CBCT"
    ),
  body("teeth")
    .optional()
    .custom((value) => {
      // Can be string (JSON) or array, validated in controller
      return true;
    }),
  body("findings")
    .optional()
    .custom((value) => {
      // Can be string (JSON) or array/object, validated in controller
      return true;
    }),
  body("technique")
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage("Technique must be less than 200 characters"),
  body("urgency")
    .optional()
    .isIn(["LOW", "MEDIUM", "HIGH", "URGENT"])
    .withMessage(
      "Invalid urgency. Must be LOW, MEDIUM, HIGH, or URGENT"
    ),
];

/**
 * Validation rules for sending X-Ray result to dentist
 */
const validateSendToDentist = [
  param("id").isUUID().withMessage("Invalid X-Ray result ID format"),
  body("dentistId")
    .optional()
    .custom((value) => {
      // If dentistId is provided, it must be a valid UUID
      // If not provided (undefined, null, empty string), that's fine (optional)
      if (value === undefined || value === null || value === "") {
        return true; // Optional field, skip validation
      }
      // If provided, validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(String(value))) {
        throw new Error("Invalid dentist ID format");
      }
      return true;
    }),
];

/**
 * Validation rules for X-Ray result ID parameter
 */
const validateXrayResultId = [
  param("id").isUUID().withMessage("Invalid X-Ray result ID format"),
];

/**
 * Validation rules for branch ID query parameter (for getting X-Ray requests)
 */
const validateBranchIdQuery = [
  query("branchId").optional().isUUID().withMessage("Invalid branch ID format"),
  query("filter")
    .optional()
    .isIn(["pending", "completed", "all"])
    .withMessage("Invalid filter. Must be 'pending', 'completed', or 'all'"),
];

module.exports = {
  validateUploadXrayResult,
  validateSendToDentist,
  validateXrayResultId,
  validateBranchIdQuery,
};

