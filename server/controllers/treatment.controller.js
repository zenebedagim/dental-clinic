const prisma = require("../config/db");
const { sendSuccess, sendError } = require("../utils/response.util");

/**
 * Calculate total cost from procedure logs
 * Note: Currently returns null as procedure costs are not stored in procedure codes
 * This function can be extended when cost data is added to procedure definitions
 */
const calculateTotalCostFromProcedures = (procedureLogs) => {
  if (!procedureLogs || !Array.isArray(procedureLogs)) {
    return null;
  }

  // TODO: When procedure costs are stored in procedure codes/database,
  // calculate total cost by summing procedure costs
  // For now, return null to allow manual cost entry

  return null;
};

/**
 * Validate and normalize clinicalExam data structure
 * Expected structure (Ethiopian Dental Clinic Format):
 * {
 *   generalAppearance: {
 *     levelOfConsciousness: string,
 *     bodyBuildPosture: string,
 *     signsOfPainDistress: string,
 *     nutritionalStatus: string,
 *     pallorJaundiceCyanosis: string,
 *     facialSymmetry: string,
 *     swellingDeformity: string
 *   },
 *   extraOral: {
 *     faceSymmetry: string,
 *     faceSwelling: string,
 *     faceSinusTract: string,
 *     faceScars: string,
 *     eyesPallor: string,
 *     eyesJaundice: string,
 *     lipsColor: string,
 *     lipsCracks: string,
 *     lipsUlcers: string,
 *     tmjPain: string,
 *     tmjClicking: string,
 *     tmjLimitation: string,
 *     lymphNodesSubmental: string,
 *     lymphNodesSubmandibular: string,
 *     lymphNodesCervical: string
 *   },
 *   intraOral: {
 *     oralHygieneStatus: string,
 *     softTissueBuccalMucosa: string,
 *     softTissueLabialMucosa: string,
 *     gingivaColor: string,
 *     gingivaConsistency: string,
 *     gingivaBleeding: string,
 *     gingivaSwelling: string,
 *     palateHard: string,
 *     palateSoft: string,
 *     floorOfMouthSwelling: string,
 *     floorOfMouthTenderness: string,
 *     floorOfMouthLesions: string,
 *     tongueSizeShape: string,
 *     tongueColor: string,
 *     tongueCoating: string,
 *     tongueMovement: string,
 *     tongueLesions: string,
 *     dentalNumberPresent: string,
 *     dentalNumberMissing: string,
 *     dentalCaries: string,
 *     dentalFilled: string,
 *     dentalFractured: string,
 *     dentalMobility: string,
 *     dentalMalocclusion: string,
 *     dentalAttritionAbrasionErosion: string,
 *     periodontalPocketDepth: string,
 *     periodontalRecession: string
 *   },
 *   provisionalFindings: string,
 *   // Legacy fields for backward compatibility
 *   extraoralFindings: string,
 *   intraoralSoftTissue: string,
 *   periodontalStatus: string,
 *   occlusionFindings: string
 * }
 */
const normalizeClinicalExam = (clinicalExam) => {
  if (!clinicalExam || typeof clinicalExam !== "object") {
    return null;
  }

  // Deep copy nested objects to preserve all fields including "Other" text fields
  // This ensures all fields from frontend (including oralHygieneStatusOther, etc.) are preserved
  const normalized = {
    // New structured format - deep copy to preserve all fields including "Other" fields
    generalAppearance: clinicalExam.generalAppearance
      ? JSON.parse(JSON.stringify(clinicalExam.generalAppearance))
      : {},
    extraOral: clinicalExam.extraOral
      ? JSON.parse(JSON.stringify(clinicalExam.extraOral))
      : {},
    intraOral: clinicalExam.intraOral
      ? JSON.parse(JSON.stringify(clinicalExam.intraOral))
      : {},
    provisionalFindings: clinicalExam.provisionalFindings || null,
    // Legacy fields for backward compatibility
    extraoralFindings: clinicalExam.extraoralFindings || null,
    intraoralSoftTissue: clinicalExam.intraoralSoftTissue || null,
    periodontalStatus: clinicalExam.periodontalStatus || null,
    occlusionFindings: clinicalExam.occlusionFindings || null,
  };

  // Check if there's any actual data (including "Other" fields)
  // Check all nested object values recursively
  const hasDataInObject = (obj) => {
    if (!obj || typeof obj !== "object") return false;
    return Object.values(obj).some((v) => {
      if (v && typeof v === "object") {
        return hasDataInObject(v);
      }
      return v !== null && v !== undefined && v !== "";
    });
  };

  const hasData =
    hasDataInObject(normalized.generalAppearance) ||
    hasDataInObject(normalized.extraOral) ||
    hasDataInObject(normalized.intraOral) ||
    normalized.provisionalFindings ||
    normalized.extraoralFindings ||
    normalized.intraoralSoftTissue ||
    normalized.periodontalStatus ||
    normalized.occlusionFindings;

  return hasData ? normalized : null;
};

const createOrUpdateTreatment = async (req, res) => {
  try {
    const {
      appointmentId,
      // Legacy fields
      diagnosis,
      treatmentPlan,
      status,
      // SOAP - Subjective
      chiefComplaint,
      historyPresentIllness,
      medicalHistory,
      dentalHistory,
      socialHistory,
      // SOAP - Objective
      vitalSigns,
      clinicalExam,
      clinicalTests,
      investigations,
      affectedTeeth,
      // SOAP - Assessment
      diagnosisCode,
      secondaryDiagnoses,
      diagnosisNotes,
      // SOAP - Plan
      toolsUsed,
      procedureLogs,
      postTreatment,
      notes,
      dentistSignature,
      totalCost,
    } = req.body;
    const { id: dentistId } = req.user;

    if (!appointmentId) {
      return sendError(res, "Appointment ID is required", 400);
    }

    // Verify the appointment belongs to this dentist
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return sendError(res, "Appointment not found", 404);
    }

    if (appointment.dentistId !== dentistId) {
      return sendError(
        res,
        "You can only create treatments for your own appointments",
        403
      );
    }

    // Prepare update/create data
    const treatmentData = {
      // Legacy fields (for backward compatibility)
      diagnosis: diagnosis || null,
      treatmentPlan: treatmentPlan || null,
      status: status || "PENDING",
      // SOAP - Subjective
      chiefComplaint: chiefComplaint || null,
      historyPresentIllness: historyPresentIllness || null,
      medicalHistory: medicalHistory || null,
      dentalHistory: dentalHistory || null,
      socialHistory: socialHistory || null,
      // SOAP - Objective
      vitalSigns: vitalSigns ? JSON.parse(JSON.stringify(vitalSigns)) : null,
      // Normalize and validate clinicalExam structure (Ethiopian Dental Format)
      // Preserves all fields including "Other" text fields
      clinicalExam: normalizeClinicalExam(clinicalExam),
      clinicalTests: clinicalTests
        ? JSON.parse(JSON.stringify(clinicalTests))
        : null,
      investigations: investigations
        ? JSON.parse(JSON.stringify(investigations))
        : null, // {types: [], other: ""}
      affectedTeeth: Array.isArray(affectedTeeth) ? affectedTeeth : [],
      // SOAP - Assessment
      diagnosisCode: diagnosisCode || null,
      secondaryDiagnoses: Array.isArray(secondaryDiagnoses)
        ? secondaryDiagnoses
        : [],
      diagnosisNotes: diagnosisNotes || null,
      // SOAP - Plan
      toolsUsed: Array.isArray(toolsUsed) ? toolsUsed : [],
      procedureLogs: procedureLogs
        ? JSON.parse(JSON.stringify(procedureLogs))
        : null,
      postTreatment: postTreatment
        ? JSON.parse(JSON.stringify(postTreatment))
        : null,
      notes: notes || null,
      dentistSignature: dentistSignature || null,
      // Calculate totalCost if procedureLogs are provided, otherwise use provided totalCost
      totalCost: totalCost
        ? parseFloat(totalCost)
        : calculateTotalCostFromProcedures(procedureLogs),
    };

    // Always create a new treatment record (allow multiple treatments per appointment)
    const treatment = await prisma.treatment.create({
      data: {
        appointmentId,
        ...treatmentData,
      },
      include: {
        appointment: {
          include: {
            branch: true,
            dentist: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return sendSuccess(res, treatment, 200, "Treatment saved successfully");
  } catch (error) {
    console.error("Create/Update treatment error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

const updateTreatmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { id: dentistId } = req.user;

    if (!status) {
      return sendError(res, "Status is required", 400);
    }

    const treatment = await prisma.treatment.findUnique({
      where: { id },
      include: {
        appointment: true,
      },
    });

    if (!treatment) {
      return sendError(res, "Treatment not found", 404);
    }

    if (treatment.appointment.dentistId !== dentistId) {
      return sendError(res, "You can only update your own treatments", 403);
    }

    const updatedTreatment = await prisma.treatment.update({
      where: { id },
      data: { status },
      include: {
        appointment: {
          include: {
            branch: true,
            dentist: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return sendSuccess(
      res,
      updatedTreatment,
      200,
      "Treatment status updated successfully"
    );
  } catch (error) {
    console.error("Update treatment status error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

const getDentistTreatments = async (req, res) => {
  try {
    const { id: dentistId } = req.user;
    const { branchId: selectedBranchId } = req.query;

    const appointmentWhere = {
      dentistId,
    };

    if (selectedBranchId) {
      appointmentWhere.branchId = selectedBranchId;
    }

    const treatments = await prisma.treatment.findMany({
      where: {
        appointment: appointmentWhere,
      },
      include: {
        appointment: {
          include: {
            branch: true,
            dentist: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            xrayResult: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return sendSuccess(res, treatments);
  } catch (error) {
    console.error("Get dentist treatments error:", error);
    return sendError(res, "Server error", 500, error);
  }
};

module.exports = {
  createOrUpdateTreatment,
  updateTreatmentStatus,
  getDentistTreatments,
};
