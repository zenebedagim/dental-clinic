/**
 * Treatment Validation Rules
 * Using express-validator for input validation
 */

const { body, param, query } = require("express-validator");

/**
 * Validation rules for creating/updating a treatment
 */
const validateCreateOrUpdateTreatment = [
  body("appointmentId").isUUID().withMessage("Invalid appointment ID format"),
  // Legacy fields
  body("diagnosis")
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage("Diagnosis must be less than 1000 characters"),
  body("treatmentPlan")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Treatment plan must be less than 2000 characters"),
  body("status")
    .optional()
    .isIn(["PENDING", "IN_PROGRESS", "COMPLETED"])
    .withMessage(
      "Invalid treatment status. Must be PENDING, IN_PROGRESS, or COMPLETED"
    ),
  // SOAP - Subjective
  body("chiefComplaint")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Chief complaint must be less than 2000 characters"),
  body("historyPresentIllness")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage(
      "History of present illness must be less than 5000 characters"
    ),
  body("medicalHistory")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Medical history must be less than 5000 characters"),
  body("dentalHistory")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Dental history must be less than 5000 characters"),
  body("socialHistory")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Social history must be less than 2000 characters"),
  // SOAP - Objective
  // clinicalExam structure (Ethiopian Dental Clinic Format):
  // - generalAppearance: { levelOfConsciousness, bodyBuildPosture, signsOfPainDistress, nutritionalStatus, pallorJaundiceCyanosis, facialSymmetry, swellingDeformity }
  // - extraOral: { faceSymmetry, faceSwelling, faceSinusTract, faceScars, eyesPallor, eyesJaundice, lipsColor, lipsCracks, lipsUlcers, tmjPain, tmjClicking, tmjLimitation, lymphNodesSubmental, lymphNodesSubmandibular, lymphNodesCervical }
  // - intraOral: { oralHygieneStatus, softTissueBuccalMucosa, softTissueLabialMucosa, gingivaColor, gingivaConsistency, gingivaBleeding, gingivaSwelling, palateHard, palateSoft, floorOfMouthSwelling, floorOfMouthTenderness, floorOfMouthLesions, tongueSizeShape, tongueColor, tongueCoating, tongueMovement, tongueLesions, dentalNumberPresent, dentalNumberMissing, dentalCaries, dentalFilled, dentalFractured, dentalMobility, dentalMalocclusion, dentalAttritionAbrasionErosion, periodontalPocketDepth, periodontalRecession }
  // - provisionalFindings: string
  // Legacy fields for backward compatibility: extraoralFindings, intraoralSoftTissue, periodontalStatus, occlusionFindings
  // (JSON fields validated in controller)
  body("affectedTeeth")
    .optional()
    .isArray()
    .withMessage("Affected teeth must be an array"),
  body("affectedTeeth.*")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 10 })
    .withMessage("Each tooth identifier must be 1-10 characters"),
  body("toolsUsed")
    .optional()
    .isArray()
    .withMessage("Tools used must be an array"),
  body("toolsUsed.*")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage("Each tool identifier must be 1-50 characters"),
  // Investigations (X-Ray types and custom notes)
  // JSON fields (vitalSigns, clinicalExam, clinicalTests, investigations, procedureLogs, postTreatment)
  // are validated in the controller as they need custom validation
  // SOAP - Assessment
  body("diagnosisCode")
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage("Diagnosis code must be less than 20 characters"),
  body("secondaryDiagnoses")
    .optional()
    .isArray()
    .withMessage("Secondary diagnoses must be an array"),
  body("secondaryDiagnoses.*")
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage("Each secondary diagnosis code must be 1-20 characters"),
  body("diagnosisNotes")
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage("Diagnosis notes must be less than 2000 characters"),
  // SOAP - Plan
  body("notes")
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Notes must be less than 5000 characters"),
  // JSON fields (vitalSigns, clinicalExam, clinicalTests, investigations, procedureLogs, postTreatment)
  // are validated in the controller as they need custom validation
];

/**
 * Validation rules for updating treatment status
 */
const validateUpdateTreatmentStatus = [
  param("id").isUUID().withMessage("Invalid treatment ID format"),
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["PENDING", "IN_PROGRESS", "COMPLETED"])
    .withMessage(
      "Invalid treatment status. Must be PENDING, IN_PROGRESS, or COMPLETED"
    ),
];

/**
 * Validation rules for treatment ID parameter
 */
const validateTreatmentId = [
  param("id").isUUID().withMessage("Invalid treatment ID format"),
];

/**
 * Validation rules for branch ID query parameter (for getting treatments)
 */
const validateBranchIdQuery = [
  query("branchId").optional().isUUID().withMessage("Invalid branch ID format"),
];

module.exports = {
  validateCreateOrUpdateTreatment,
  validateUpdateTreatmentStatus,
  validateTreatmentId,
  validateBranchIdQuery,
};
