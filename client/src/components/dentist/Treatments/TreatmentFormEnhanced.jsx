import { useState, useEffect } from "react";
import api from "../../../services/api";
import { TREATMENT_STATUS } from "../../../utils/constants";
import {
  getInitialTreatmentFormData,
  mapTreatmentToFormData,
  prepareTreatmentSubmitData,
} from "../../../utils/treatmentFormUtils";
import { useToast } from "../../../hooks/useToast";
import ToothChart from "./ToothChart";
import DiagnosisSelector from "./DiagnosisSelector";
import ProcedureLogger from "./ProcedureLogger";
import VitalSignsForm from "../Vitals/VitalSignsForm";

const TreatmentFormEnhanced = ({ appointment, onTreatmentSaved }) => {
  const { success: showSuccess, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // SOAP Form Data
  const [formData, setFormData] = useState(getInitialTreatmentFormData());

  useEffect(() => {
    if (appointment?.treatment) {
      setFormData(mapTreatmentToFormData(appointment.treatment));
    } else {
      // Reset form
      setFormData(getInitialTreatmentFormData());
    }
  }, [appointment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!appointment) return;

    // Validate appointment has an ID
    if (!appointment.id) {
      const errorMsg =
        "Appointment ID is missing. Please select an appointment first.";
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    // No required validations - allow partial saves
    // Dentists can save progress and update later

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const submitData = prepareTreatmentSubmitData(formData, appointment.id);

      await api.post("/treatments", submitData);
      setSuccess(
        "Treatment saved successfully! You can continue editing and save again to update."
      );
      showSuccess(
        "Treatment saved successfully! You can continue editing and save again to update."
      );
      if (onTreatmentSaved) {
        onTreatmentSaved();
      }
    } catch (err) {
      // Extract detailed error message from response
      let errorMsg = "Failed to save treatment";

      if (err.response?.data) {
        // Check for validation errors
        if (
          err.response.data.errors &&
          Array.isArray(err.response.data.errors)
        ) {
          const validationErrors = err.response.data.errors
            .map((e) => `${e.field}: ${e.message}`)
            .join(", ");
          errorMsg = `Validation failed: ${validationErrors}`;
        } else if (err.response.data.message) {
          errorMsg = err.response.data.message;
        }
      }

      console.error("Treatment save error:", err.response?.data || err);
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold md:text-2xl">
          {appointment?.patientName
            ? `Treatment for ${appointment.patientName}`
            : "Treatment Form (SOAP Workflow)"}
        </h2>
      </div>

      {error && (
        <div className="px-4 py-3 text-red-700 bg-red-100 border border-red-400 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="px-4 py-3 text-green-700 bg-green-100 border border-green-400 rounded">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
        {/* S - SUBJECTIVE */}
        <section className="pb-4 border-b border-gray-200 md:pb-6">
          <h3 className="mb-4 text-lg font-semibold text-indigo-700 md:text-xl">
            S - Subjective (Patient Information)
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Chief Complaint
              </label>
              <textarea
                value={formData.chiefComplaint}
                onChange={(e) =>
                  setFormData({ ...formData, chiefComplaint: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Patient's reason for visit in their own words..."
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                History of Present Illness
              </label>
              <textarea
                value={formData.historyPresentIllness}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    historyPresentIllness: e.target.value,
                  })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Details of current issue..."
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Medical History
                </label>
                <textarea
                  value={formData.medicalHistory}
                  onChange={(e) =>
                    setFormData({ ...formData, medicalHistory: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Systemic diseases, allergies, medications..."
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Dental History
                </label>
                <textarea
                  value={formData.dentalHistory}
                  onChange={(e) =>
                    setFormData({ ...formData, dentalHistory: e.target.value })
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Past treatments, pain events, problems..."
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Allergic History
              </label>
              <textarea
                value={formData.socialHistory}
                onChange={(e) =>
                  setFormData({ ...formData, socialHistory: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Drug allergies, food allergies, latex allergy, etc..."
              />
            </div>
          </div>
        </section>

        {/* Physical Examination */}
        <section className="pb-4 border-b border-gray-200 md:pb-6">
          <h3 className="mb-4 text-lg font-semibold text-indigo-700 md:text-xl">
            Physical Examination
          </h3>

          {/* 1. General Appearance */}
          <div className="p-4 mb-6 rounded-lg bg-gray-50">
            <h4 className="mb-4 font-semibold text-gray-800">
              1. General Appearance
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Level of Consciousness
                </label>
                <select
                  value={formData.generalAppearance.levelOfConsciousness}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      generalAppearance: {
                        ...formData.generalAppearance,
                        levelOfConsciousness: e.target.value,
                        levelOfConsciousnessOther:
                          e.target.value !== "Other"
                            ? ""
                            : formData.generalAppearance
                                .levelOfConsciousnessOther,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select...</option>
                  <option value="Alert">Alert</option>
                  <option value="Drowsy">Drowsy</option>
                  <option value="Other">Other</option>
                </select>
                {formData.generalAppearance.levelOfConsciousness ===
                  "Other" && (
                  <input
                    type="text"
                    value={formData.generalAppearance.levelOfConsciousnessOther}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        generalAppearance: {
                          ...formData.generalAppearance,
                          levelOfConsciousnessOther: e.target.value,
                        },
                      })
                    }
                    placeholder="Please specify..."
                    className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Body Build & Posture
                </label>
                <select
                  value={formData.generalAppearance.bodyBuildPosture}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      generalAppearance: {
                        ...formData.generalAppearance,
                        bodyBuildPosture: e.target.value,
                        bodyBuildPostureOther:
                          e.target.value !== "Other"
                            ? ""
                            : formData.generalAppearance.bodyBuildPostureOther,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select...</option>
                  <option value="Normal">Normal</option>
                  <option value="Underweight">Underweight</option>
                  <option value="Overweight">Overweight</option>
                  <option value="Abnormal Posture">Abnormal Posture</option>
                  <option value="Other">Other</option>
                </select>
                {formData.generalAppearance.bodyBuildPosture === "Other" && (
                  <input
                    type="text"
                    value={formData.generalAppearance.bodyBuildPostureOther}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        generalAppearance: {
                          ...formData.generalAppearance,
                          bodyBuildPostureOther: e.target.value,
                        },
                      })
                    }
                    placeholder="Please specify..."
                    className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Signs of Pain or Distress
                </label>
                <select
                  value={formData.generalAppearance.signsOfPainDistress}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      generalAppearance: {
                        ...formData.generalAppearance,
                        signsOfPainDistress: e.target.value,
                        signsOfPainDistressOther:
                          e.target.value !== "Other"
                            ? ""
                            : formData.generalAppearance
                                .signsOfPainDistressOther,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select...</option>
                  <option value="None">None</option>
                  <option value="Mild">Mild</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Severe">Severe</option>
                  <option value="Other">Other</option>
                </select>
                {formData.generalAppearance.signsOfPainDistress === "Other" && (
                  <input
                    type="text"
                    value={formData.generalAppearance.signsOfPainDistressOther}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        generalAppearance: {
                          ...formData.generalAppearance,
                          signsOfPainDistressOther: e.target.value,
                        },
                      })
                    }
                    placeholder="Please specify..."
                    className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Nutritional Status
                </label>
                <select
                  value={formData.generalAppearance.nutritionalStatus}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      generalAppearance: {
                        ...formData.generalAppearance,
                        nutritionalStatus: e.target.value,
                        nutritionalStatusOther:
                          e.target.value !== "Other"
                            ? ""
                            : formData.generalAppearance.nutritionalStatusOther,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select...</option>
                  <option value="Well Nourished">Well Nourished</option>
                  <option value="Moderately Nourished">
                    Moderately Nourished
                  </option>
                  <option value="Poorly Nourished">Poorly Nourished</option>
                  <option value="Other">Other</option>
                </select>
                {formData.generalAppearance.nutritionalStatus === "Other" && (
                  <input
                    type="text"
                    value={formData.generalAppearance.nutritionalStatusOther}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        generalAppearance: {
                          ...formData.generalAppearance,
                          nutritionalStatusOther: e.target.value,
                        },
                      })
                    }
                    placeholder="Please specify..."
                    className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Pallor / Jaundice / Cyanosis
                </label>
                <select
                  value={formData.generalAppearance.pallorJaundiceCyanosis}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      generalAppearance: {
                        ...formData.generalAppearance,
                        pallorJaundiceCyanosis: e.target.value,
                        pallorJaundiceCyanosisOther:
                          e.target.value !== "Other"
                            ? ""
                            : formData.generalAppearance
                                .pallorJaundiceCyanosisOther,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select...</option>
                  <option value="None">None</option>
                  <option value="Pallor">Pallor</option>
                  <option value="Jaundice">Jaundice</option>
                  <option value="Cyanosis">Cyanosis</option>
                  <option value="Other">Other</option>
                </select>
                {formData.generalAppearance.pallorJaundiceCyanosis ===
                  "Other" && (
                  <input
                    type="text"
                    value={
                      formData.generalAppearance.pallorJaundiceCyanosisOther
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        generalAppearance: {
                          ...formData.generalAppearance,
                          pallorJaundiceCyanosisOther: e.target.value,
                        },
                      })
                    }
                    placeholder="Please specify..."
                    className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Facial Symmetry
                </label>
                <select
                  value={formData.generalAppearance.facialSymmetry}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      generalAppearance: {
                        ...formData.generalAppearance,
                        facialSymmetry: e.target.value,
                        facialSymmetryOther:
                          e.target.value !== "Other"
                            ? ""
                            : formData.generalAppearance.facialSymmetryOther,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select...</option>
                  <option value="Symmetrical">Symmetrical</option>
                  <option value="Asymmetrical">Asymmetrical</option>
                  <option value="Other">Other</option>
                </select>
                {formData.generalAppearance.facialSymmetry === "Other" && (
                  <input
                    type="text"
                    value={formData.generalAppearance.facialSymmetryOther}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        generalAppearance: {
                          ...formData.generalAppearance,
                          facialSymmetryOther: e.target.value,
                        },
                      })
                    }
                    placeholder="Please specify..."
                    className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Swelling or Deformity
                </label>
                <select
                  value={formData.generalAppearance.swellingDeformity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      generalAppearance: {
                        ...formData.generalAppearance,
                        swellingDeformity: e.target.value,
                        swellingDeformityOther:
                          e.target.value !== "Other"
                            ? ""
                            : formData.generalAppearance.swellingDeformityOther,
                      },
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select...</option>
                  <option value="None">None</option>
                  <option value="Swelling Present">Swelling Present</option>
                  <option value="Deformity Present">Deformity Present</option>
                  <option value="Both Present">Both Present</option>
                  <option value="Other">Other</option>
                </select>
                {formData.generalAppearance.swellingDeformity === "Other" && (
                  <input
                    type="text"
                    value={formData.generalAppearance.swellingDeformityOther}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        generalAppearance: {
                          ...formData.generalAppearance,
                          swellingDeformityOther: e.target.value,
                        },
                      })
                    }
                    placeholder="Please specify..."
                    className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                )}
              </div>
            </div>
          </div>

          {/* 2. Vital Signs */}
          <div className="p-4 mb-6 rounded-lg bg-gray-50">
            <h4 className="mb-4 font-semibold text-gray-800">2. Vital Signs</h4>
            <VitalSignsForm
              vitalSigns={formData.vitalSigns}
              onVitalSignsChange={(vitals) =>
                setFormData({ ...formData, vitalSigns: vitals })
              }
            />
          </div>

          {/* 3. Extra-Oral Examination */}
          <div className="p-4 mb-6 rounded-lg bg-gray-50">
            <h4 className="mb-4 font-semibold text-gray-800">
              3. Extra-Oral Examination
            </h4>

            {/* Face */}
            <div className="mb-4">
              <h5 className="mb-2 text-sm font-semibold text-gray-700">Face</h5>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">
                    Symmetry
                  </label>
                  <select
                    value={formData.extraOral.faceSymmetry}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extraOral: {
                          ...formData.extraOral,
                          faceSymmetry: e.target.value,
                          faceSymmetryOther:
                            e.target.value !== "Other"
                              ? ""
                              : formData.extraOral.faceSymmetryOther,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="Symmetrical">Symmetrical</option>
                    <option value="Asymmetrical">Asymmetrical</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.extraOral.faceSymmetry === "Other" && (
                    <input
                      type="text"
                      value={formData.extraOral.faceSymmetryOther}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          extraOral: {
                            ...formData.extraOral,
                            faceSymmetryOther: e.target.value,
                          },
                        })
                      }
                      placeholder="Please specify..."
                      className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">
                    Swelling
                  </label>
                  <select
                    value={formData.extraOral.faceSwelling}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extraOral: {
                          ...formData.extraOral,
                          faceSwelling: e.target.value,
                          faceSwellingOther:
                            e.target.value !== "Other"
                              ? ""
                              : formData.extraOral.faceSwellingOther,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="None">None</option>
                    <option value="Present">Present</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.extraOral.faceSwelling === "Other" && (
                    <input
                      type="text"
                      value={formData.extraOral.faceSwellingOther}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          extraOral: {
                            ...formData.extraOral,
                            faceSwellingOther: e.target.value,
                          },
                        })
                      }
                      placeholder="Please specify..."
                      className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">
                    Sinus Tract
                  </label>
                  <select
                    value={formData.extraOral.faceSinusTract}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extraOral: {
                          ...formData.extraOral,
                          faceSinusTract: e.target.value,
                          faceSinusTractOther:
                            e.target.value !== "Other"
                              ? ""
                              : formData.extraOral.faceSinusTractOther,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="None">None</option>
                    <option value="Present">Present</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.extraOral.faceSinusTract === "Other" && (
                    <input
                      type="text"
                      value={formData.extraOral.faceSinusTractOther}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          extraOral: {
                            ...formData.extraOral,
                            faceSinusTractOther: e.target.value,
                          },
                        })
                      }
                      placeholder="Please specify..."
                      className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">
                    Scars
                  </label>
                  <select
                    value={formData.extraOral.faceScars}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extraOral: {
                          ...formData.extraOral,
                          faceScars: e.target.value,
                          faceScarsOther:
                            e.target.value !== "Other"
                              ? ""
                              : formData.extraOral.faceScarsOther,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="None">None</option>
                    <option value="Present">Present</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.extraOral.faceScars === "Other" && (
                    <input
                      type="text"
                      value={formData.extraOral.faceScarsOther}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          extraOral: {
                            ...formData.extraOral,
                            faceScarsOther: e.target.value,
                          },
                        })
                      }
                      placeholder="Please specify..."
                      className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Eyes */}
            <div className="mb-4">
              <h5 className="mb-2 text-sm font-semibold text-gray-700">Eyes</h5>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">
                    Pallor
                  </label>
                  <select
                    value={formData.extraOral.eyesPallor}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extraOral: {
                          ...formData.extraOral,
                          eyesPallor: e.target.value,
                          eyesPallorOther:
                            e.target.value !== "Other"
                              ? ""
                              : formData.extraOral.eyesPallorOther,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="None">None</option>
                    <option value="Present">Present</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.extraOral.eyesPallor === "Other" && (
                    <input
                      type="text"
                      value={formData.extraOral.eyesPallorOther}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          extraOral: {
                            ...formData.extraOral,
                            eyesPallorOther: e.target.value,
                          },
                        })
                      }
                      placeholder="Please specify..."
                      className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">
                    Jaundice
                  </label>
                  <select
                    value={formData.extraOral.eyesJaundice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extraOral: {
                          ...formData.extraOral,
                          eyesJaundice: e.target.value,
                          eyesJaundiceOther:
                            e.target.value !== "Other"
                              ? ""
                              : formData.extraOral.eyesJaundiceOther,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="None">None</option>
                    <option value="Present">Present</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.extraOral.eyesJaundice === "Other" && (
                    <input
                      type="text"
                      value={formData.extraOral.eyesJaundiceOther}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          extraOral: {
                            ...formData.extraOral,
                            eyesJaundiceOther: e.target.value,
                          },
                        })
                      }
                      placeholder="Please specify..."
                      className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Lips */}
            <div className="mb-4">
              <h5 className="mb-2 text-sm font-semibold text-gray-700">Lips</h5>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">
                    Color
                  </label>
                  <select
                    value={formData.extraOral.lipsColor}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extraOral: {
                          ...formData.extraOral,
                          lipsColor: e.target.value,
                          lipsColorOther:
                            e.target.value !== "Other"
                              ? ""
                              : formData.extraOral.lipsColorOther,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="Normal">Normal</option>
                    <option value="Pale">Pale</option>
                    <option value="Cyanotic">Cyanotic</option>
                    <option value="Erythematous">Erythematous</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.extraOral.lipsColor === "Other" && (
                    <input
                      type="text"
                      value={formData.extraOral.lipsColorOther}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          extraOral: {
                            ...formData.extraOral,
                            lipsColorOther: e.target.value,
                          },
                        })
                      }
                      placeholder="Please specify..."
                      className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">
                    Cracks
                  </label>
                  <select
                    value={formData.extraOral.lipsCracks}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extraOral: {
                          ...formData.extraOral,
                          lipsCracks: e.target.value,
                          lipsCracksOther:
                            e.target.value !== "Other"
                              ? ""
                              : formData.extraOral.lipsCracksOther,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="None">None</option>
                    <option value="Present">Present</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.extraOral.lipsCracks === "Other" && (
                    <input
                      type="text"
                      value={formData.extraOral.lipsCracksOther}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          extraOral: {
                            ...formData.extraOral,
                            lipsCracksOther: e.target.value,
                          },
                        })
                      }
                      placeholder="Please specify..."
                      className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">
                    Ulcers
                  </label>
                  <select
                    value={formData.extraOral.lipsUlcers}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extraOral: {
                          ...formData.extraOral,
                          lipsUlcers: e.target.value,
                          lipsUlcersOther:
                            e.target.value !== "Other"
                              ? ""
                              : formData.extraOral.lipsUlcersOther,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="None">None</option>
                    <option value="Present">Present</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.extraOral.lipsUlcers === "Other" && (
                    <input
                      type="text"
                      value={formData.extraOral.lipsUlcersOther}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          extraOral: {
                            ...formData.extraOral,
                            lipsUlcersOther: e.target.value,
                          },
                        })
                      }
                      placeholder="Please specify..."
                      className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* TMJ */}
            <div className="mb-4">
              <h5 className="mb-2 text-sm font-semibold text-gray-700">
                TMJ (Temporomandibular Joint)
              </h5>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">
                    Pain
                  </label>
                  <select
                    value={formData.extraOral.tmjPain}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extraOral: {
                          ...formData.extraOral,
                          tmjPain: e.target.value,
                          tmjPainOther:
                            e.target.value !== "Other"
                              ? ""
                              : formData.extraOral.tmjPainOther,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="None">None</option>
                    <option value="Present">Present</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.extraOral.tmjPain === "Other" && (
                    <input
                      type="text"
                      value={formData.extraOral.tmjPainOther}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          extraOral: {
                            ...formData.extraOral,
                            tmjPainOther: e.target.value,
                          },
                        })
                      }
                      placeholder="Please specify..."
                      className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">
                    Clicking
                  </label>
                  <select
                    value={formData.extraOral.tmjClicking}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extraOral: {
                          ...formData.extraOral,
                          tmjClicking: e.target.value,
                          tmjClickingOther:
                            e.target.value !== "Other"
                              ? ""
                              : formData.extraOral.tmjClickingOther,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="None">None</option>
                    <option value="Present">Present</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.extraOral.tmjClicking === "Other" && (
                    <input
                      type="text"
                      value={formData.extraOral.tmjClickingOther}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          extraOral: {
                            ...formData.extraOral,
                            tmjClickingOther: e.target.value,
                          },
                        })
                      }
                      placeholder="Please specify..."
                      className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">
                    Limitation of Movement
                  </label>
                  <select
                    value={formData.extraOral.tmjLimitation}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extraOral: {
                          ...formData.extraOral,
                          tmjLimitation: e.target.value,
                          tmjLimitationOther:
                            e.target.value !== "Other"
                              ? ""
                              : formData.extraOral.tmjLimitationOther,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="None">None</option>
                    <option value="Present">Present</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.extraOral.tmjLimitation === "Other" && (
                    <input
                      type="text"
                      value={formData.extraOral.tmjLimitationOther}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          extraOral: {
                            ...formData.extraOral,
                            tmjLimitationOther: e.target.value,
                          },
                        })
                      }
                      placeholder="Please specify..."
                      className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Lymph Nodes */}
            <div className="mb-4">
              <h5 className="mb-2 text-sm font-semibold text-gray-700">
                Lymph Nodes
              </h5>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">
                    Submental
                  </label>
                  <select
                    value={formData.extraOral.lymphNodesSubmental}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extraOral: {
                          ...formData.extraOral,
                          lymphNodesSubmental: e.target.value,
                          lymphNodesSubmentalOther:
                            e.target.value !== "Other"
                              ? ""
                              : formData.extraOral.lymphNodesSubmentalOther,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="Not Palpable">Not Palpable</option>
                    <option value="Palpable - Normal">Palpable - Normal</option>
                    <option value="Enlarged - Tender">Enlarged - Tender</option>
                    <option value="Enlarged - Non-tender">
                      Enlarged - Non-tender
                    </option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.extraOral.lymphNodesSubmental === "Other" && (
                    <input
                      type="text"
                      value={formData.extraOral.lymphNodesSubmentalOther}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          extraOral: {
                            ...formData.extraOral,
                            lymphNodesSubmentalOther: e.target.value,
                          },
                        })
                      }
                      placeholder="Please specify..."
                      className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">
                    Submandibular
                  </label>
                  <select
                    value={formData.extraOral.lymphNodesSubmandibular}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extraOral: {
                          ...formData.extraOral,
                          lymphNodesSubmandibular: e.target.value,
                          lymphNodesSubmandibularOther:
                            e.target.value !== "Other"
                              ? ""
                              : formData.extraOral.lymphNodesSubmandibularOther,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="Not Palpable">Not Palpable</option>
                    <option value="Palpable - Normal">Palpable - Normal</option>
                    <option value="Enlarged - Tender">Enlarged - Tender</option>
                    <option value="Enlarged - Non-tender">
                      Enlarged - Non-tender
                    </option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.extraOral.lymphNodesSubmandibular === "Other" && (
                    <input
                      type="text"
                      value={formData.extraOral.lymphNodesSubmandibularOther}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          extraOral: {
                            ...formData.extraOral,
                            lymphNodesSubmandibularOther: e.target.value,
                          },
                        })
                      }
                      placeholder="Please specify..."
                      className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">
                    Cervical
                  </label>
                  <select
                    value={formData.extraOral.lymphNodesCervical}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        extraOral: {
                          ...formData.extraOral,
                          lymphNodesCervical: e.target.value,
                          lymphNodesCervicalOther:
                            e.target.value !== "Other"
                              ? ""
                              : formData.extraOral.lymphNodesCervicalOther,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="Not Palpable">Not Palpable</option>
                    <option value="Palpable - Normal">Palpable - Normal</option>
                    <option value="Enlarged - Tender">Enlarged - Tender</option>
                    <option value="Enlarged - Non-tender">
                      Enlarged - Non-tender
                    </option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.extraOral.lymphNodesCervical === "Other" && (
                    <input
                      type="text"
                      value={formData.extraOral.lymphNodesCervicalOther}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          extraOral: {
                            ...formData.extraOral,
                            lymphNodesCervicalOther: e.target.value,
                          },
                        })
                      }
                      placeholder="Please specify..."
                      className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4. Intra-Oral Examination */}
          <div className="p-4 mb-6 rounded-lg bg-gray-50">
            <h4 className="mb-4 font-semibold text-gray-800">
              4. Intra-Oral Examination
            </h4>

            {/* Oral Hygiene Status */}
            <div className="mb-4">
              <h5 className="mb-2 text-sm font-semibold text-gray-700">
                4.1 Oral Hygiene Status
              </h5>
              <select
                value={formData.intraOral.oralHygieneStatus}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    intraOral: {
                      ...formData.intraOral,
                      oralHygieneStatus: e.target.value,
                      oralHygieneStatusOther:
                        e.target.value !== "Other"
                          ? ""
                          : formData.intraOral.oralHygieneStatusOther,
                    },
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select...</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
                <option value="Other">Other</option>
              </select>
              {formData.intraOral.oralHygieneStatus === "Other" && (
                <input
                  type="text"
                  value={formData.intraOral.oralHygieneStatusOther}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      intraOral: {
                        ...formData.intraOral,
                        oralHygieneStatusOther: e.target.value,
                      },
                    })
                  }
                  placeholder="Please specify..."
                  className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              )}
              <p className="mt-1 text-xs text-gray-500">
                Assessed by plaque, calculus, and debris
              </p>
            </div>

            {/* Soft Tissue Examination */}
            <div className="mb-4">
              <h5 className="mb-2 text-sm font-semibold text-gray-700">
                4.2 Soft Tissue Examination
              </h5>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-600">
                      Buccal Mucosa
                    </label>
                    <select
                      value={formData.intraOral.softTissueBuccalMucosa}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          intraOral: {
                            ...formData.intraOral,
                            softTissueBuccalMucosa: e.target.value,
                            softTissueBuccalMucosaOther:
                              e.target.value !== "Other"
                                ? ""
                                : formData.intraOral
                                    .softTissueBuccalMucosaOther,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select...</option>
                      <option value="Normal">Normal</option>
                      <option value="Abnormal">Abnormal</option>
                      <option value="Other">Other</option>
                    </select>
                    {formData.intraOral.softTissueBuccalMucosa === "Other" && (
                      <input
                        type="text"
                        value={formData.intraOral.softTissueBuccalMucosaOther}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intraOral: {
                              ...formData.intraOral,
                              softTissueBuccalMucosaOther: e.target.value,
                            },
                          })
                        }
                        placeholder="Please specify..."
                        className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-600">
                      Labial Mucosa
                    </label>
                    <select
                      value={formData.intraOral.softTissueLabialMucosa}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          intraOral: {
                            ...formData.intraOral,
                            softTissueLabialMucosa: e.target.value,
                            softTissueLabialMucosaOther:
                              e.target.value !== "Other"
                                ? ""
                                : formData.intraOral
                                    .softTissueLabialMucosaOther,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select...</option>
                      <option value="Normal">Normal</option>
                      <option value="Abnormal">Abnormal</option>
                      <option value="Other">Other</option>
                    </select>
                    {formData.intraOral.softTissueLabialMucosa === "Other" && (
                      <input
                        type="text"
                        value={formData.intraOral.softTissueLabialMucosaOther}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intraOral: {
                              ...formData.intraOral,
                              softTissueLabialMucosaOther: e.target.value,
                            },
                          })
                        }
                        placeholder="Please specify..."
                        className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </div>
                </div>

                {/* Gingiva */}
                <div>
                  <h6 className="mb-2 text-xs font-semibold text-gray-600">
                    Gingiva
                  </h6>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="block mb-1 text-xs font-medium text-gray-600">
                        Color
                      </label>
                      <select
                        value={formData.intraOral.gingivaColor}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intraOral: {
                              ...formData.intraOral,
                              gingivaColor: e.target.value,
                              gingivaColorOther:
                                e.target.value !== "Other"
                                  ? ""
                                  : formData.intraOral.gingivaColorOther,
                            },
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select...</option>
                        <option value="Pink">Pink</option>
                        <option value="Pale">Pale</option>
                        <option value="Erythematous">Erythematous</option>
                        <option value="Cyanotic">Cyanotic</option>
                        <option value="Other">Other</option>
                      </select>
                      {formData.intraOral.gingivaColor === "Other" && (
                        <input
                          type="text"
                          value={formData.intraOral.gingivaColorOther}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              intraOral: {
                                ...formData.intraOral,
                                gingivaColorOther: e.target.value,
                              },
                            })
                          }
                          placeholder="Please specify..."
                          className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block mb-1 text-xs font-medium text-gray-600">
                        Consistency
                      </label>
                      <select
                        value={formData.intraOral.gingivaConsistency}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intraOral: {
                              ...formData.intraOral,
                              gingivaConsistency: e.target.value,
                              gingivaConsistencyOther:
                                e.target.value !== "Other"
                                  ? ""
                                  : formData.intraOral.gingivaConsistencyOther,
                            },
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select...</option>
                        <option value="Firm">Firm</option>
                        <option value="Soft">Soft</option>
                        <option value="Spongy">Spongy</option>
                        <option value="Other">Other</option>
                      </select>
                      {formData.intraOral.gingivaConsistency === "Other" && (
                        <input
                          type="text"
                          value={formData.intraOral.gingivaConsistencyOther}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              intraOral: {
                                ...formData.intraOral,
                                gingivaConsistencyOther: e.target.value,
                              },
                            })
                          }
                          placeholder="Please specify..."
                          className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block mb-1 text-xs font-medium text-gray-600">
                        Bleeding
                      </label>
                      <select
                        value={formData.intraOral.gingivaBleeding}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intraOral: {
                              ...formData.intraOral,
                              gingivaBleeding: e.target.value,
                              gingivaBleedingOther:
                                e.target.value !== "Other"
                                  ? ""
                                  : formData.intraOral.gingivaBleedingOther,
                            },
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select...</option>
                        <option value="None">None</option>
                        <option value="On Probing">On Probing</option>
                        <option value="Spontaneous">Spontaneous</option>
                        <option value="Other">Other</option>
                      </select>
                      {formData.intraOral.gingivaBleeding === "Other" && (
                        <input
                          type="text"
                          value={formData.intraOral.gingivaBleedingOther}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              intraOral: {
                                ...formData.intraOral,
                                gingivaBleedingOther: e.target.value,
                              },
                            })
                          }
                          placeholder="Please specify..."
                          className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block mb-1 text-xs font-medium text-gray-600">
                        Swelling
                      </label>
                      <select
                        value={formData.intraOral.gingivaSwelling}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intraOral: {
                              ...formData.intraOral,
                              gingivaSwelling: e.target.value,
                              gingivaSwellingOther:
                                e.target.value !== "Other"
                                  ? ""
                                  : formData.intraOral.gingivaSwellingOther,
                            },
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select...</option>
                        <option value="None">None</option>
                        <option value="Present">Present</option>
                        <option value="Other">Other</option>
                      </select>
                      {formData.intraOral.gingivaSwelling === "Other" && (
                        <input
                          type="text"
                          value={formData.intraOral.gingivaSwellingOther}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              intraOral: {
                                ...formData.intraOral,
                                gingivaSwellingOther: e.target.value,
                              },
                            })
                          }
                          placeholder="Please specify..."
                          className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Palate */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-600">
                      Hard Palate
                    </label>
                    <select
                      value={formData.intraOral.palateHard}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          intraOral: {
                            ...formData.intraOral,
                            palateHard: e.target.value,
                            palateHardOther:
                              e.target.value !== "Other"
                                ? ""
                                : formData.intraOral.palateHardOther,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select...</option>
                      <option value="Normal">Normal</option>
                      <option value="Abnormal">Abnormal</option>
                      <option value="Other">Other</option>
                    </select>
                    {formData.intraOral.palateHard === "Other" && (
                      <input
                        type="text"
                        value={formData.intraOral.palateHardOther}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intraOral: {
                              ...formData.intraOral,
                              palateHardOther: e.target.value,
                            },
                          })
                        }
                        placeholder="Please specify..."
                        className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-600">
                      Soft Palate
                    </label>
                    <select
                      value={formData.intraOral.palateSoft}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          intraOral: {
                            ...formData.intraOral,
                            palateSoft: e.target.value,
                            palateSoftOther:
                              e.target.value !== "Other"
                                ? ""
                                : formData.intraOral.palateSoftOther,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select...</option>
                      <option value="Normal">Normal</option>
                      <option value="Abnormal">Abnormal</option>
                      <option value="Other">Other</option>
                    </select>
                    {formData.intraOral.palateSoft === "Other" && (
                      <input
                        type="text"
                        value={formData.intraOral.palateSoftOther}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intraOral: {
                              ...formData.intraOral,
                              palateSoftOther: e.target.value,
                            },
                          })
                        }
                        placeholder="Please specify..."
                        className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </div>
                </div>

                {/* Floor of Mouth */}
                <div>
                  <h6 className="mb-2 text-xs font-semibold text-gray-600">
                    Floor of Mouth
                  </h6>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div>
                      <label className="block mb-1 text-xs font-medium text-gray-600">
                        Swelling
                      </label>
                      <select
                        value={formData.intraOral.floorOfMouthSwelling}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intraOral: {
                              ...formData.intraOral,
                              floorOfMouthSwelling: e.target.value,
                              floorOfMouthSwellingOther:
                                e.target.value !== "Other"
                                  ? ""
                                  : formData.intraOral
                                      .floorOfMouthSwellingOther,
                            },
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select...</option>
                        <option value="None">None</option>
                        <option value="Present">Present</option>
                        <option value="Other">Other</option>
                      </select>
                      {formData.intraOral.floorOfMouthSwelling === "Other" && (
                        <input
                          type="text"
                          value={formData.intraOral.floorOfMouthSwellingOther}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              intraOral: {
                                ...formData.intraOral,
                                floorOfMouthSwellingOther: e.target.value,
                              },
                            })
                          }
                          placeholder="Please specify..."
                          className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block mb-1 text-xs font-medium text-gray-600">
                        Tenderness
                      </label>
                      <select
                        value={formData.intraOral.floorOfMouthTenderness}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intraOral: {
                              ...formData.intraOral,
                              floorOfMouthTenderness: e.target.value,
                              floorOfMouthTendernessOther:
                                e.target.value !== "Other"
                                  ? ""
                                  : formData.intraOral
                                      .floorOfMouthTendernessOther,
                            },
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select...</option>
                        <option value="None">None</option>
                        <option value="Present">Present</option>
                        <option value="Other">Other</option>
                      </select>
                      {formData.intraOral.floorOfMouthTenderness ===
                        "Other" && (
                        <input
                          type="text"
                          value={formData.intraOral.floorOfMouthTendernessOther}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              intraOral: {
                                ...formData.intraOral,
                                floorOfMouthTendernessOther: e.target.value,
                              },
                            })
                          }
                          placeholder="Please specify..."
                          className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block mb-1 text-xs font-medium text-gray-600">
                        Lesions
                      </label>
                      <select
                        value={formData.intraOral.floorOfMouthLesions}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intraOral: {
                              ...formData.intraOral,
                              floorOfMouthLesions: e.target.value,
                              floorOfMouthLesionsOther:
                                e.target.value !== "Other"
                                  ? ""
                                  : formData.intraOral.floorOfMouthLesionsOther,
                            },
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select...</option>
                        <option value="None">None</option>
                        <option value="Present">Present</option>
                        <option value="Other">Other</option>
                      </select>
                      {formData.intraOral.floorOfMouthLesions === "Other" && (
                        <input
                          type="text"
                          value={formData.intraOral.floorOfMouthLesionsOther}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              intraOral: {
                                ...formData.intraOral,
                                floorOfMouthLesionsOther: e.target.value,
                              },
                            })
                          }
                          placeholder="Please specify..."
                          className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tongue Examination */}
            <div className="mb-4">
              <h5 className="mb-2 text-sm font-semibold text-gray-700">
                4.3 Tongue Examination
              </h5>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">
                    Size & Shape
                  </label>
                  <select
                    value={formData.intraOral.tongueSizeShape}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        intraOral: {
                          ...formData.intraOral,
                          tongueSizeShape: e.target.value,
                          tongueSizeShapeOther:
                            e.target.value !== "Other"
                              ? ""
                              : formData.intraOral.tongueSizeShapeOther,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="Normal">Normal</option>
                    <option value="Enlarged">Enlarged</option>
                    <option value="Abnormal Shape">Abnormal Shape</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.intraOral.tongueSizeShape === "Other" && (
                    <input
                      type="text"
                      value={formData.intraOral.tongueSizeShapeOther}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          intraOral: {
                            ...formData.intraOral,
                            tongueSizeShapeOther: e.target.value,
                          },
                        })
                      }
                      placeholder="Please specify..."
                      className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">
                    Color
                  </label>
                  <select
                    value={formData.intraOral.tongueColor}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        intraOral: {
                          ...formData.intraOral,
                          tongueColor: e.target.value,
                          tongueColorOther:
                            e.target.value !== "Other"
                              ? ""
                              : formData.intraOral.tongueColorOther,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="Normal">Normal</option>
                    <option value="Pale">Pale</option>
                    <option value="Erythematous">Erythematous</option>
                    <option value="Coated">Coated</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.intraOral.tongueColor === "Other" && (
                    <input
                      type="text"
                      value={formData.intraOral.tongueColorOther}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          intraOral: {
                            ...formData.intraOral,
                            tongueColorOther: e.target.value,
                          },
                        })
                      }
                      placeholder="Please specify..."
                      className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">
                    Coating
                  </label>
                  <select
                    value={formData.intraOral.tongueCoating}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        intraOral: {
                          ...formData.intraOral,
                          tongueCoating: e.target.value,
                          tongueCoatingOther:
                            e.target.value !== "Other"
                              ? ""
                              : formData.intraOral.tongueCoatingOther,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="None">None</option>
                    <option value="Present">Present</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.intraOral.tongueCoating === "Other" && (
                    <input
                      type="text"
                      value={formData.intraOral.tongueCoatingOther}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          intraOral: {
                            ...formData.intraOral,
                            tongueCoatingOther: e.target.value,
                          },
                        })
                      }
                      placeholder="Please specify..."
                      className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">
                    Movement
                  </label>
                  <select
                    value={formData.intraOral.tongueMovement}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        intraOral: {
                          ...formData.intraOral,
                          tongueMovement: e.target.value,
                          tongueMovementOther:
                            e.target.value !== "Other"
                              ? ""
                              : formData.intraOral.tongueMovementOther,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="Normal">Normal</option>
                    <option value="Limited">Limited</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.intraOral.tongueMovement === "Other" && (
                    <input
                      type="text"
                      value={formData.intraOral.tongueMovementOther}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          intraOral: {
                            ...formData.intraOral,
                            tongueMovementOther: e.target.value,
                          },
                        })
                      }
                      placeholder="Please specify..."
                      className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block mb-1 text-xs font-medium text-gray-600">
                    Lesions/Ulcers
                  </label>
                  <select
                    value={formData.intraOral.tongueLesions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        intraOral: {
                          ...formData.intraOral,
                          tongueLesions: e.target.value,
                          tongueLesionsOther:
                            e.target.value !== "Other"
                              ? ""
                              : formData.intraOral.tongueLesionsOther,
                        },
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select...</option>
                    <option value="None">None</option>
                    <option value="Present">Present</option>
                    <option value="Other">Other</option>
                  </select>
                  {formData.intraOral.tongueLesions === "Other" && (
                    <input
                      type="text"
                      value={formData.intraOral.tongueLesionsOther}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          intraOral: {
                            ...formData.intraOral,
                            tongueLesionsOther: e.target.value,
                          },
                        })
                      }
                      placeholder="Please specify..."
                      className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Dental Examination */}
            <div className="mb-4">
              <h5 className="mb-2 text-sm font-semibold text-gray-700">
                4.4 Dental Examination
              </h5>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-600">
                      Number of Teeth Present
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="32"
                      value={formData.intraOral.dentalNumberPresent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          intraOral: {
                            ...formData.intraOral,
                            dentalNumberPresent: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., 28"
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-600">
                      Number of Teeth Missing
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="32"
                      value={formData.intraOral.dentalNumberMissing}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          intraOral: {
                            ...formData.intraOral,
                            dentalNumberMissing: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g., 4"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-600">
                      Dental Caries
                    </label>
                    <select
                      value={formData.intraOral.dentalCaries}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          intraOral: {
                            ...formData.intraOral,
                            dentalCaries: e.target.value,
                            dentalCariesOther:
                              e.target.value !== "Other"
                                ? ""
                                : formData.intraOral.dentalCariesOther,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select...</option>
                      <option value="None">None</option>
                      <option value="Localized">Localized</option>
                      <option value="Generalized">Generalized</option>
                      <option value="Other">Other</option>
                    </select>
                    {formData.intraOral.dentalCaries === "Other" && (
                      <input
                        type="text"
                        value={formData.intraOral.dentalCariesOther}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intraOral: {
                              ...formData.intraOral,
                              dentalCariesOther: e.target.value,
                            },
                          })
                        }
                        placeholder="Please specify..."
                        className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-600">
                      Filled Teeth
                    </label>
                    <select
                      value={formData.intraOral.dentalFilled}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          intraOral: {
                            ...formData.intraOral,
                            dentalFilled: e.target.value,
                            dentalFilledOther:
                              e.target.value !== "Other"
                                ? ""
                                : formData.intraOral.dentalFilledOther,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select...</option>
                      <option value="None">None</option>
                      <option value="Present">Present</option>
                      <option value="Other">Other</option>
                    </select>
                    {formData.intraOral.dentalFilled === "Other" && (
                      <input
                        type="text"
                        value={formData.intraOral.dentalFilledOther}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intraOral: {
                              ...formData.intraOral,
                              dentalFilledOther: e.target.value,
                            },
                          })
                        }
                        placeholder="Please specify..."
                        className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-600">
                      Fractured Teeth
                    </label>
                    <select
                      value={formData.intraOral.dentalFractured}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          intraOral: {
                            ...formData.intraOral,
                            dentalFractured: e.target.value,
                            dentalFracturedOther:
                              e.target.value !== "Other"
                                ? ""
                                : formData.intraOral.dentalFracturedOther,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select...</option>
                      <option value="None">None</option>
                      <option value="Present">Present</option>
                      <option value="Other">Other</option>
                    </select>
                    {formData.intraOral.dentalFractured === "Other" && (
                      <input
                        type="text"
                        value={formData.intraOral.dentalFracturedOther}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intraOral: {
                              ...formData.intraOral,
                              dentalFracturedOther: e.target.value,
                            },
                          })
                        }
                        placeholder="Please specify..."
                        className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-600">
                      Mobility
                    </label>
                    <select
                      value={formData.intraOral.dentalMobility}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          intraOral: {
                            ...formData.intraOral,
                            dentalMobility: e.target.value,
                            dentalMobilityOther:
                              e.target.value !== "Other"
                                ? ""
                                : formData.intraOral.dentalMobilityOther,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select...</option>
                      <option value="None">None</option>
                      <option value="Grade I">Grade I</option>
                      <option value="Grade II">Grade II</option>
                      <option value="Grade III">Grade III</option>
                      <option value="Other">Other</option>
                    </select>
                    {formData.intraOral.dentalMobility === "Other" && (
                      <input
                        type="text"
                        value={formData.intraOral.dentalMobilityOther}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intraOral: {
                              ...formData.intraOral,
                              dentalMobilityOther: e.target.value,
                            },
                          })
                        }
                        placeholder="Please specify..."
                        className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-600">
                      Malocclusion
                    </label>
                    <select
                      value={formData.intraOral.dentalMalocclusion}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          intraOral: {
                            ...formData.intraOral,
                            dentalMalocclusion: e.target.value,
                            dentalMalocclusionOther:
                              e.target.value !== "Other"
                                ? ""
                                : formData.intraOral.dentalMalocclusionOther,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select...</option>
                      <option value="None">None</option>
                      <option value="Present">Present</option>
                      <option value="Other">Other</option>
                    </select>
                    {formData.intraOral.dentalMalocclusion === "Other" && (
                      <input
                        type="text"
                        value={formData.intraOral.dentalMalocclusionOther}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intraOral: {
                              ...formData.intraOral,
                              dentalMalocclusionOther: e.target.value,
                            },
                          })
                        }
                        placeholder="Please specify..."
                        className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block mb-1 text-xs font-medium text-gray-600">
                      Attrition/Abrasion/Erosion
                    </label>
                    <select
                      value={formData.intraOral.dentalAttritionAbrasionErosion}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          intraOral: {
                            ...formData.intraOral,
                            dentalAttritionAbrasionErosion: e.target.value,
                            dentalAttritionAbrasionErosionOther:
                              e.target.value !== "Other"
                                ? ""
                                : formData.intraOral
                                    .dentalAttritionAbrasionErosionOther,
                          },
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select...</option>
                      <option value="None">None</option>
                      <option value="Attrition">Attrition</option>
                      <option value="Abrasion">Abrasion</option>
                      <option value="Erosion">Erosion</option>
                      <option value="Combined">Combined</option>
                      <option value="Other">Other</option>
                    </select>
                    {formData.intraOral.dentalAttritionAbrasionErosion ===
                      "Other" && (
                      <input
                        type="text"
                        value={
                          formData.intraOral.dentalAttritionAbrasionErosionOther
                        }
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intraOral: {
                              ...formData.intraOral,
                              dentalAttritionAbrasionErosionOther:
                                e.target.value,
                            },
                          })
                        }
                        placeholder="Please specify..."
                        className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                  </div>
                </div>

                {/* Periodontal Status */}
                <div>
                  <h6 className="mb-2 text-xs font-semibold text-gray-600">
                    Periodontal Status
                  </h6>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div>
                      <label className="block mb-1 text-xs font-medium text-gray-600">
                        Pocket Depth
                      </label>
                      <select
                        value={formData.intraOral.periodontalPocketDepth}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intraOral: {
                              ...formData.intraOral,
                              periodontalPocketDepth: e.target.value,
                              periodontalPocketDepthOther:
                                e.target.value !== "Other"
                                  ? ""
                                  : formData.intraOral
                                      .periodontalPocketDepthOther,
                            },
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select...</option>
                        <option value="Normal (≤3mm)">Normal (≤3mm)</option>
                        <option value="Mild (4-5mm)">Mild (4-5mm)</option>
                        <option value="Moderate (6-7mm)">
                          Moderate (6-7mm)
                        </option>
                        <option value="Severe (≥8mm)">Severe (≥8mm)</option>
                        <option value="Other">Other</option>
                      </select>
                      {formData.intraOral.periodontalPocketDepth ===
                        "Other" && (
                        <input
                          type="text"
                          value={formData.intraOral.periodontalPocketDepthOther}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              intraOral: {
                                ...formData.intraOral,
                                periodontalPocketDepthOther: e.target.value,
                              },
                            })
                          }
                          placeholder="Please specify..."
                          className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block mb-1 text-xs font-medium text-gray-600">
                        Gum Recession
                      </label>
                      <select
                        value={formData.intraOral.periodontalRecession}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            intraOral: {
                              ...formData.intraOral,
                              periodontalRecession: e.target.value,
                              periodontalRecessionOther:
                                e.target.value !== "Other"
                                  ? ""
                                  : formData.intraOral
                                      .periodontalRecessionOther,
                            },
                          })
                        }
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select...</option>
                        <option value="None">None</option>
                        <option value="Localized">Localized</option>
                        <option value="Generalized">Generalized</option>
                        <option value="Other">Other</option>
                      </select>
                      {formData.intraOral.periodontalRecession === "Other" && (
                        <input
                          type="text"
                          value={formData.intraOral.periodontalRecessionOther}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              intraOral: {
                                ...formData.intraOral,
                                periodontalRecessionOther: e.target.value,
                              },
                            })
                          }
                          placeholder="Please specify..."
                          className="w-full px-3 py-2 mt-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Clinical Tests */}
          <div className="p-4 mb-6 rounded-lg bg-gray-50">
            <h4 className="mb-3 font-semibold text-gray-800">
              5. Clinical Tests
            </h4>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Pulp Vitality Tests
                </label>
                <textarea
                  value={formData.clinicalTests.pulpVitality}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      clinicalTests: {
                        ...formData.clinicalTests,
                        pulpVitality: e.target.value,
                      },
                    })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="EPT, thermal tests..."
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Percussion Tests
                </label>
                <textarea
                  value={formData.clinicalTests.percussion}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      clinicalTests: {
                        ...formData.clinicalTests,
                        percussion: e.target.value,
                      },
                    })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Tap test results..."
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Thermal Sensitivity
                </label>
                <textarea
                  value={formData.clinicalTests.thermalSensitivity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      clinicalTests: {
                        ...formData.clinicalTests,
                        thermalSensitivity: e.target.value,
                      },
                    })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Cold/hot response..."
                />
              </div>

              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700">
                  Mobility Tests
                </label>
                <textarea
                  value={formData.clinicalTests.mobility}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      clinicalTests: {
                        ...formData.clinicalTests,
                        mobility: e.target.value,
                      },
                    })
                  }
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Tooth movement assessment..."
                />
              </div>
            </div>
          </div>

          {/* 6. Provisional Findings / Impression */}
          <div className="p-4 mb-6 rounded-lg bg-gray-50">
            <h4 className="mb-3 font-semibold text-gray-800">
              6. Provisional Findings / Impression
            </h4>
            <textarea
              value={formData.provisionalFindings}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  provisionalFindings: e.target.value,
                })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Initial clinical impression based on examination findings (e.g., Poor oral hygiene with generalized dental caries and gingivitis)..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Summary of findings from physical examination
            </p>
          </div>
        </section>

        {/* A - ASSESSMENT */}
        <section className="pb-4 border-b border-gray-200 md:pb-6">
          <h3 className="mb-4 text-lg font-semibold text-indigo-700 md:text-xl">
            A - Assessment (Diagnosis)
          </h3>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <DiagnosisSelector
                primaryDiagnosis={formData.primaryDiagnosis}
                secondaryDiagnoses={formData.secondaryDiagnoses}
                onPrimaryDiagnosisChange={(diagnosis) =>
                  setFormData({
                    ...formData,
                    primaryDiagnosis: diagnosis,
                    diagnosisCode: diagnosis?.code || "",
                  })
                }
                onSecondaryDiagnosesChange={(diagnoses) =>
                  setFormData({ ...formData, secondaryDiagnoses: diagnoses })
                }
              />
            </div>

            {/* Tooth Chart - Only show when diagnosis is selected */}
            {(formData.primaryDiagnosis ||
              (formData.secondaryDiagnoses &&
                formData.secondaryDiagnoses.length > 0)) && (
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-700">
                  Tooth Chart - Select Affected Teeth
                </label>
                <ToothChart
                  selectedTeeth={formData.affectedTeeth}
                  onTeethChange={(teeth) =>
                    setFormData({ ...formData, affectedTeeth: teeth })
                  }
                  procedureLogs={formData.procedureLogs}
                  primaryDiagnosis={formData.primaryDiagnosis}
                  secondaryDiagnoses={formData.secondaryDiagnoses}
                  onProcedureSelectForTooth={(toothNumber, procedureName) => {
                    // Add new procedure for the selected tooth
                    const newProcedure = {
                      name: procedureName,
                      description: procedureName,
                      tooth: String(toothNumber),
                      duration: null,
                      anesthesia: null,
                      notes: null,
                    };
                    setFormData({
                      ...formData,
                      procedureLogs: [...formData.procedureLogs, newProcedure],
                    });
                  }}
                />
              </div>
            )}
          </div>

          <div className="mt-4">
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Diagnosis Notes
            </label>
            <textarea
              value={formData.diagnosisNotes}
              onChange={(e) =>
                setFormData({ ...formData, diagnosisNotes: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Additional diagnostic notes..."
            />
          </div>
        </section>

        {/* P - PLAN */}
        <section className="pb-4 border-b border-gray-200 md:pb-6">
          <h3 className="mb-4 text-lg font-semibold text-indigo-700 md:text-xl">
            P - Plan (Treatment)
          </h3>

          <div className="space-y-6">
            {/* Treatment Plan */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Treatment Plan
              </label>
              <textarea
                value={formData.treatmentPlan}
                onChange={(e) =>
                  setFormData({ ...formData, treatmentPlan: e.target.value })
                }
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Comprehensive treatment plan..."
              />
            </div>

            {/* Procedures Performed */}
            <ProcedureLogger
              procedures={formData.procedureLogs}
              onProceduresChange={(procedures) =>
                setFormData({ ...formData, procedureLogs: procedures })
              }
            />

            {/* Post-Treatment Care */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="mb-3 font-semibold text-gray-800">
                Post-Treatment Care
              </h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Pain Level (0-10)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={formData.postTreatment.painLevel}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        postTreatment: {
                          ...formData.postTreatment,
                          painLevel: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={formData.postTreatment.followUpDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        postTreatment: {
                          ...formData.postTreatment,
                          followUpDate: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Complications
                  </label>
                  <textarea
                    value={formData.postTreatment.complications}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        postTreatment: {
                          ...formData.postTreatment,
                          complications: e.target.value,
                        },
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Bleeding, swelling, etc..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Post-Care Instructions
                  </label>
                  <textarea
                    value={formData.postTreatment.instructions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        postTreatment: {
                          ...formData.postTreatment,
                          instructions: e.target.value,
                        },
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Care instructions, restrictions..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block mb-1 text-sm font-medium text-gray-700">
                    Medications Prescribed
                  </label>
                  <textarea
                    value={formData.postTreatment.medications}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        postTreatment: {
                          ...formData.postTreatment,
                          medications: e.target.value,
                        },
                      })
                    }
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Rx and instructions..."
                  />
                </div>
              </div>
            </div>

            {/* General Notes */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Any additional notes..."
              />
            </div>

            {/* Status */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Treatment Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={TREATMENT_STATUS.IN_PROGRESS}>
                  In Progress
                </option>
                <option value={TREATMENT_STATUS.COMPLETED}>Completed</option>
              </select>
            </div>
          </div>
        </section>

        {/* Dentist Signature */}
        <section className="pb-4 border-b border-gray-200 md:pb-6">
          <h3 className="mb-4 text-lg font-semibold text-indigo-700 md:text-xl">
            Dentist Signature
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Signature
              </label>
              <input
                type="text"
                value={formData.dentistSignature}
                onChange={(e) =>
                  setFormData({ ...formData, dentistSignature: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter dentist signature"
              />
              <p className="mt-1 text-xs text-gray-500">
                Enter the dentist's signature or name
              </p>
            </div>
          </div>
        </section>

        {/* Submit Button */}
        <div className="flex justify-end gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-4 md:px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold min-h-[44px]"
          >
            {loading ? "Saving..." : "Save Treatment"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TreatmentFormEnhanced;
