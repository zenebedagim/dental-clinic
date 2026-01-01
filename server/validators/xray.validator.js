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
];

/**
 * Validation rules for creating X-Ray share
 */
const validateCreateXrayShare = [
  param("xrayId").isUUID().withMessage("Invalid X-Ray ID format"),
  body("password")
    .optional()
    .trim()
    .isLength({ min: 4, max: 50 })
    .withMessage("Password must be between 4 and 50 characters"),
  body("expiresAt")
    .optional()
    .isISO8601()
    .withMessage("Invalid expiration date format. Use ISO 8601 format")
    .custom((value) => {
      const expiryDate = new Date(value);
      const now = new Date();
      if (expiryDate <= now) {
        throw new Error("Expiration date must be in the future");
      }
      return true;
    }),
  body("maxViews")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Max views must be between 1 and 1000"),
];

/**
 * Validation rules for X-Ray share ID
 */
const validateXrayShareId = [
  param("shareId").isUUID().withMessage("Invalid share ID format"),
];

/**
 * Validation rules for share token
 */
const validateShareToken = [
  param("token")
    .trim()
    .notEmpty()
    .withMessage("Share token is required")
    .isLength({ min: 32, max: 64 })
    .withMessage("Invalid share token format"),
];

module.exports = {
  validateUploadXrayResult,
  validateSendToDentist,
  validateXrayResultId,
  validateBranchIdQuery,
  validateCreateXrayShare,
  validateXrayShareId,
  validateShareToken,
};

