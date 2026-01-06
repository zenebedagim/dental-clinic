/**
 * Treatment Form Utilities
 * Initial form data structure and helper functions for treatment forms
 */

import { TREATMENT_STATUS } from "./constants";

/**
 * Get initial/default treatment form data structure
 * @returns {Object} Initial form data object
 */
export const getInitialTreatmentFormData = () => ({
  // Subjective
  chiefComplaint: "",
  historyPresentIllness: "",
  medicalHistory: "",
  dentalHistory: "",
  socialHistory: "",

  // Objective - Vital Signs
  vitalSigns: null,

  // Objective - Physical Examination (Ethiopian Format)
  // General Appearance
  generalAppearance: {
    levelOfConsciousness: "",
    levelOfConsciousnessOther: "",
    bodyBuildPosture: "",
    bodyBuildPostureOther: "",
    signsOfPainDistress: "",
    signsOfPainDistressOther: "",
    nutritionalStatus: "",
    nutritionalStatusOther: "",
    pallorJaundiceCyanosis: "",
    pallorJaundiceCyanosisOther: "",
    facialSymmetry: "",
    facialSymmetryOther: "",
    swellingDeformity: "",
    swellingDeformityOther: "",
  },

  // Extra-Oral Examination
  extraOral: {
    faceSymmetry: "",
    faceSymmetryOther: "",
    faceSwelling: "",
    faceSwellingOther: "",
    faceSinusTract: "",
    faceSinusTractOther: "",
    faceScars: "",
    faceScarsOther: "",
    eyesPallor: "",
    eyesPallorOther: "",
    eyesJaundice: "",
    eyesJaundiceOther: "",
    lipsColor: "",
    lipsColorOther: "",
    lipsCracks: "",
    lipsCracksOther: "",
    lipsUlcers: "",
    lipsUlcersOther: "",
    tmjPain: "",
    tmjPainOther: "",
    tmjClicking: "",
    tmjClickingOther: "",
    tmjLimitation: "",
    tmjLimitationOther: "",
    lymphNodesSubmental: "",
    lymphNodesSubmentalOther: "",
    lymphNodesSubmandibular: "",
    lymphNodesSubmandibularOther: "",
    lymphNodesCervical: "",
    lymphNodesCervicalOther: "",
  },

  // Intra-Oral Examination
  intraOral: {
    oralHygieneStatus: "",
    oralHygieneStatusOther: "",
    softTissueBuccalMucosa: "",
    softTissueBuccalMucosaOther: "",
    softTissueLabialMucosa: "",
    softTissueLabialMucosaOther: "",
    gingivaColor: "",
    gingivaColorOther: "",
    gingivaConsistency: "",
    gingivaConsistencyOther: "",
    gingivaBleeding: "",
    gingivaBleedingOther: "",
    gingivaSwelling: "",
    gingivaSwellingOther: "",
    palateHard: "",
    palateHardOther: "",
    palateSoft: "",
    palateSoftOther: "",
    floorOfMouthSwelling: "",
    floorOfMouthSwellingOther: "",
    floorOfMouthTenderness: "",
    floorOfMouthTendernessOther: "",
    floorOfMouthLesions: "",
    floorOfMouthLesionsOther: "",
    tongueSizeShape: "",
    tongueSizeShapeOther: "",
    tongueColor: "",
    tongueColorOther: "",
    tongueCoating: "",
    tongueCoatingOther: "",
    tongueMovement: "",
    tongueMovementOther: "",
    tongueLesions: "",
    tongueLesionsOther: "",
    dentalNumberPresent: "",
    dentalNumberMissing: "",
    dentalCaries: "",
    dentalCariesOther: "",
    dentalFilled: "",
    dentalFilledOther: "",
    dentalFractured: "",
    dentalFracturedOther: "",
    dentalMobility: "",
    dentalMobilityOther: "",
    dentalMalocclusion: "",
    dentalMalocclusionOther: "",
    dentalAttritionAbrasionErosion: "",
    dentalAttritionAbrasionErosionOther: "",
    periodontalPocketDepth: "",
    periodontalPocketDepthOther: "",
    periodontalRecession: "",
    periodontalRecessionOther: "",
  },

  // Clinical Tests
  clinicalTests: {
    pulpVitality: "",
    percussion: "",
    thermalSensitivity: "",
    mobility: "",
  },

  // Provisional Findings/Impression
  provisionalFindings: "",

  // Legacy fields for backward compatibility during transition
  extraoralFindings: "",
  intraoralSoftTissue: "",
  periodontalStatus: "",
  occlusionFindings: "",
  affectedTeeth: [],
  toothConditions: {}, // Map of tooth number to condition

  // Investigations / X-Ray
  investigations: [],
  investigationOther: "",

  // Assessment
  primaryDiagnosis: null,
  secondaryDiagnoses: [],
  diagnosisNotes: "",
  diagnosisCode: "",

  // Plan
  treatmentPlan: "",
  procedureLogs: [],
  postTreatment: {
    painLevel: "",
    complications: "",
    instructions: "",
    medications: "",
    followUpDate: "",
  },
  notes: "",

  // Status - Default to IN_PROGRESS since opening treatment form means starting treatment
  status: TREATMENT_STATUS.IN_PROGRESS,

  // Dentist Signature
  dentistSignature: "",
});

/**
 * Map treatment data from API to form data structure
 * @param {Object} treatment - Treatment object from API
 * @returns {Object} Form data object
 */
export const mapTreatmentToFormData = (treatment) => {
  const clinicalExam = treatment?.clinicalExam || {};

  // Map existing clinicalExam JSON to new structured fields
  // If new structured format exists, use it; otherwise map from legacy format
  const generalAppearance = clinicalExam.generalAppearance || {};
  const generalAppearanceWithDefaults = {
    levelOfConsciousness: generalAppearance.levelOfConsciousness || "",
    levelOfConsciousnessOther:
      generalAppearance.levelOfConsciousnessOther || "",
    bodyBuildPosture: generalAppearance.bodyBuildPosture || "",
    bodyBuildPostureOther: generalAppearance.bodyBuildPostureOther || "",
    signsOfPainDistress: generalAppearance.signsOfPainDistress || "",
    signsOfPainDistressOther:
      generalAppearance.signsOfPainDistressOther || "",
    nutritionalStatus: generalAppearance.nutritionalStatus || "",
    nutritionalStatusOther: generalAppearance.nutritionalStatusOther || "",
    pallorJaundiceCyanosis: generalAppearance.pallorJaundiceCyanosis || "",
    pallorJaundiceCyanosisOther:
      generalAppearance.pallorJaundiceCyanosisOther || "",
    facialSymmetry: generalAppearance.facialSymmetry || "",
    facialSymmetryOther: generalAppearance.facialSymmetryOther || "",
    swellingDeformity: generalAppearance.swellingDeformity || "",
    swellingDeformityOther: generalAppearance.swellingDeformityOther || "",
  };

  const extraOral = clinicalExam.extraOral || {};
  const extraOralWithDefaults = {
    faceSymmetry: extraOral.faceSymmetry || "",
    faceSymmetryOther: extraOral.faceSymmetryOther || "",
    faceSwelling: extraOral.faceSwelling || "",
    faceSwellingOther: extraOral.faceSwellingOther || "",
    faceSinusTract: extraOral.faceSinusTract || "",
    faceSinusTractOther: extraOral.faceSinusTractOther || "",
    faceScars: extraOral.faceScars || "",
    faceScarsOther: extraOral.faceScarsOther || "",
    eyesPallor: extraOral.eyesPallor || "",
    eyesPallorOther: extraOral.eyesPallorOther || "",
    eyesJaundice: extraOral.eyesJaundice || "",
    eyesJaundiceOther: extraOral.eyesJaundiceOther || "",
    lipsColor: extraOral.lipsColor || "",
    lipsColorOther: extraOral.lipsColorOther || "",
    lipsCracks: extraOral.lipsCracks || "",
    lipsCracksOther: extraOral.lipsCracksOther || "",
    lipsUlcers: extraOral.lipsUlcers || "",
    lipsUlcersOther: extraOral.lipsUlcersOther || "",
    tmjPain: extraOral.tmjPain || "",
    tmjPainOther: extraOral.tmjPainOther || "",
    tmjClicking: extraOral.tmjClicking || "",
    tmjClickingOther: extraOral.tmjClickingOther || "",
    tmjLimitation: extraOral.tmjLimitation || "",
    tmjLimitationOther: extraOral.tmjLimitationOther || "",
    lymphNodesSubmental: extraOral.lymphNodesSubmental || "",
    lymphNodesSubmentalOther: extraOral.lymphNodesSubmentalOther || "",
    lymphNodesSubmandibular: extraOral.lymphNodesSubmandibular || "",
    lymphNodesSubmandibularOther:
      extraOral.lymphNodesSubmandibularOther || "",
    lymphNodesCervical: extraOral.lymphNodesCervical || "",
    lymphNodesCervicalOther: extraOral.lymphNodesCervicalOther || "",
  };

  const intraOral = clinicalExam.intraOral || {};
  const intraOralWithDefaults = {
    oralHygieneStatus: intraOral.oralHygieneStatus || "",
    oralHygieneStatusOther: intraOral.oralHygieneStatusOther || "",
    softTissueBuccalMucosa: intraOral.softTissueBuccalMucosa || "",
    softTissueBuccalMucosaOther:
      intraOral.softTissueBuccalMucosaOther || "",
    softTissueLabialMucosa: intraOral.softTissueLabialMucosa || "",
    softTissueLabialMucosaOther:
      intraOral.softTissueLabialMucosaOther || "",
    gingivaColor: intraOral.gingivaColor || "",
    gingivaColorOther: intraOral.gingivaColorOther || "",
    gingivaConsistency: intraOral.gingivaConsistency || "",
    gingivaConsistencyOther: intraOral.gingivaConsistencyOther || "",
    gingivaBleeding: intraOral.gingivaBleeding || "",
    gingivaBleedingOther: intraOral.gingivaBleedingOther || "",
    gingivaSwelling: intraOral.gingivaSwelling || "",
    gingivaSwellingOther: intraOral.gingivaSwellingOther || "",
    palateHard: intraOral.palateHard || "",
    palateHardOther: intraOral.palateHardOther || "",
    palateSoft: intraOral.palateSoft || "",
    palateSoftOther: intraOral.palateSoftOther || "",
    floorOfMouthSwelling: intraOral.floorOfMouthSwelling || "",
    floorOfMouthSwellingOther: intraOral.floorOfMouthSwellingOther || "",
    floorOfMouthTenderness: intraOral.floorOfMouthTenderness || "",
    floorOfMouthTendernessOther:
      intraOral.floorOfMouthTendernessOther || "",
    floorOfMouthLesions: intraOral.floorOfMouthLesions || "",
    floorOfMouthLesionsOther: intraOral.floorOfMouthLesionsOther || "",
    tongueSizeShape: intraOral.tongueSizeShape || "",
    tongueSizeShapeOther: intraOral.tongueSizeShapeOther || "",
    tongueColor: intraOral.tongueColor || "",
    tongueColorOther: intraOral.tongueColorOther || "",
    tongueCoating: intraOral.tongueCoating || "",
    tongueCoatingOther: intraOral.tongueCoatingOther || "",
    tongueMovement: intraOral.tongueMovement || "",
    tongueMovementOther: intraOral.tongueMovementOther || "",
    tongueLesions: intraOral.tongueLesions || "",
    tongueLesionsOther: intraOral.tongueLesionsOther || "",
    dentalNumberPresent: intraOral.dentalNumberPresent || "",
    dentalNumberMissing: intraOral.dentalNumberMissing || "",
    dentalCaries: intraOral.dentalCaries || "",
    dentalCariesOther: intraOral.dentalCariesOther || "",
    dentalFilled: intraOral.dentalFilled || "",
    dentalFilledOther: intraOral.dentalFilledOther || "",
    dentalFractured: intraOral.dentalFractured || "",
    dentalFracturedOther: intraOral.dentalFracturedOther || "",
    dentalMobility: intraOral.dentalMobility || "",
    dentalMobilityOther: intraOral.dentalMobilityOther || "",
    dentalMalocclusion: intraOral.dentalMalocclusion || "",
    dentalMalocclusionOther: intraOral.dentalMalocclusionOther || "",
    dentalAttritionAbrasionErosion:
      intraOral.dentalAttritionAbrasionErosion || "",
    dentalAttritionAbrasionErosionOther:
      intraOral.dentalAttritionAbrasionErosionOther || "",
    periodontalPocketDepth: intraOral.periodontalPocketDepth || "",
    periodontalPocketDepthOther:
      intraOral.periodontalPocketDepthOther || "",
    periodontalRecession: intraOral.periodontalRecession || "",
    periodontalRecessionOther: intraOral.periodontalRecessionOther || "",
  };

  return {
    chiefComplaint: treatment.chiefComplaint || "",
    historyPresentIllness: treatment.historyPresentIllness || "",
    medicalHistory: treatment.medicalHistory || "",
    dentalHistory: treatment.dentalHistory || "",
    socialHistory: treatment.socialHistory || "",
    vitalSigns: treatment.vitalSigns || null,
    generalAppearance: generalAppearanceWithDefaults,
    extraOral: extraOralWithDefaults,
    intraOral: intraOralWithDefaults,
    clinicalTests: treatment.clinicalTests || {
      pulpVitality: "",
      percussion: "",
      thermalSensitivity: "",
      mobility: "",
    },
    provisionalFindings: clinicalExam.provisionalFindings || "",
    // Legacy fields for backward compatibility
    extraoralFindings: clinicalExam.extraoralFindings || "",
    intraoralSoftTissue: clinicalExam.intraoralSoftTissue || "",
    periodontalStatus: clinicalExam.periodontalStatus || "",
    occlusionFindings: clinicalExam.occlusionFindings || "",
    affectedTeeth: Array.isArray(treatment.affectedTeeth)
      ? treatment.affectedTeeth
          .map((tooth) =>
            typeof tooth === "string" ? parseInt(tooth, 10) : tooth
          )
          .filter((tooth) => !isNaN(tooth))
      : [],
    toothConditions: {},
    investigations:
      treatment.investigations?.types || treatment.investigations || [],
    investigationOther:
      treatment.investigations?.other || treatment.investigationOther || "",
    primaryDiagnosis: treatment.diagnosisCode
      ? { code: treatment.diagnosisCode, name: treatment.diagnosis || "" }
      : null,
    secondaryDiagnoses:
      treatment.secondaryDiagnoses?.map((code) => ({
        code,
        name: "",
      })) || [],
    diagnosisNotes: treatment.diagnosisNotes || "",
    diagnosisCode: treatment.diagnosisCode || "",
    treatmentPlan: treatment.treatmentPlan || "",
    procedureLogs: treatment.procedureLogs || [],
    postTreatment: treatment.postTreatment || {
      painLevel: "",
      complications: "",
      instructions: "",
      medications: "",
      followUpDate: "",
    },
    notes: treatment.notes || "",
    status: treatment.status || TREATMENT_STATUS.PENDING,
    dentistSignature: treatment.dentistSignature || "",
  };
};

/**
 * Prepare form data for API submission
 * @param {Object} formData - Form data object
 * @param {string} appointmentId - Appointment ID
 * @returns {Object} Data object ready for API submission
 */
export const prepareTreatmentSubmitData = (formData, appointmentId) => {
  // Prepare data for API - map new structured fields to clinicalExam JSON
  const clinicalExam = {
    // New structured format
    generalAppearance: formData.generalAppearance,
    extraOral: formData.extraOral,
    intraOral: formData.intraOral,
    provisionalFindings: formData.provisionalFindings || null,
    // Legacy fields for backward compatibility
    extraoralFindings: formData.extraoralFindings || null,
    intraoralSoftTissue: formData.intraoralSoftTissue || null,
    periodontalStatus: formData.periodontalStatus || null,
    occlusionFindings: formData.occlusionFindings || null,
  };

  // Check if any field has data
  const hasData =
    Object.values(formData.generalAppearance).some((v) => v) ||
    Object.values(formData.extraOral).some((v) => v) ||
    Object.values(formData.intraOral).some((v) => v) ||
    formData.provisionalFindings ||
    Object.values(clinicalExam)
      .slice(4)
      .some((v) => v);

  return {
    appointmentId: appointmentId,
    // Legacy fields for backward compatibility
    diagnosis: formData.primaryDiagnosis?.name || null,
    treatmentPlan: formData.treatmentPlan || null,
    status: formData.status || TREATMENT_STATUS.PENDING,
    // New SOAP fields
    chiefComplaint: formData.chiefComplaint || null,
    historyPresentIllness: formData.historyPresentIllness || null,
    medicalHistory: formData.medicalHistory || null,
    dentalHistory: formData.dentalHistory || null,
    socialHistory: formData.socialHistory || null,
    vitalSigns: formData.vitalSigns || null,
    clinicalExam: hasData ? clinicalExam : null,
    clinicalTests: Object.values(formData.clinicalTests).some((v) => v)
      ? formData.clinicalTests
      : null,
    diagnosisCode: formData.primaryDiagnosis?.code || null,
    secondaryDiagnoses:
      formData.secondaryDiagnoses?.map((d) => d.code) || [],
    diagnosisNotes: formData.diagnosisNotes || null,
    investigations:
      formData.investigations.length > 0 ||
      formData.investigationOther.trim()
        ? {
            types: formData.investigations,
            other: formData.investigationOther.trim() || null,
          }
        : null,
    affectedTeeth: Array.isArray(formData.affectedTeeth)
      ? formData.affectedTeeth.map((tooth) => String(tooth)).filter(Boolean)
      : [],
    procedureLogs:
      formData.procedureLogs.length > 0 ? formData.procedureLogs : null,
    postTreatment: Object.values(formData.postTreatment).some((v) => v)
      ? formData.postTreatment
      : null,
    notes: formData.notes,
    dentistSignature: formData.dentistSignature || null,
  };
};

