import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../../common/Modal";
import XrayImageViewer from "../../common/XrayImageViewer";
import { formatDate } from "../../../utils/tableUtils";

const TreatmentDetailModal = ({
  isOpen,
  onClose,
  treatment,
  appointment,
  patient,
}) => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("soap");

  if (!treatment && !appointment) {
    return null;
  }

  const treatmentData = treatment || appointment?.treatment;
  const xrayResult = appointment?.xrayResult;
  const patientData = patient || appointment?.patient || appointment;

  const handleEditTreatment = () => {
    // Create appointment object with treatment data for editing
    const appointmentForEdit = {
      ...appointment,
      treatment: treatmentData || appointment?.treatment,
      treatments:
        appointment?.treatments || (treatmentData ? [treatmentData] : []),
      patient: patientData || appointment?.patient,
    };

    // Navigate to treatment page with appointment data (includes treatment for pre-filling)
    navigate("/dentist/treatment", {
      state: {
        appointment: appointmentForEdit,
      },
    });

    // Close the modal
    onClose();
  };

  const renderSOAPSection = () => {
    if (!treatmentData) return null;

    return (
      <div className="space-y-6">
        {/* Subjective */}
        {(treatmentData.chiefComplaint ||
          treatmentData.historyPresentIllness ||
          treatmentData.medicalHistory ||
          treatmentData.dentalHistory ||
          treatmentData.socialHistory) && (
          <div className="border-b border-gray-200 pb-4">
            <h4 className="text-lg font-semibold text-indigo-700 mb-3">
              Subjective
            </h4>
            <div className="space-y-3">
              {treatmentData.chiefComplaint && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Chief Complaint
                  </p>
                  <p className="text-base text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                    {treatmentData.chiefComplaint}
                  </p>
                </div>
              )}
              {treatmentData.historyPresentIllness && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    History of Present Illness
                  </p>
                  <p className="text-base text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                    {treatmentData.historyPresentIllness}
                  </p>
                </div>
              )}
              {treatmentData.medicalHistory && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Medical History
                  </p>
                  <p className="text-base text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                    {treatmentData.medicalHistory}
                  </p>
                </div>
              )}
              {treatmentData.dentalHistory && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Dental History
                  </p>
                  <p className="text-base text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                    {treatmentData.dentalHistory}
                  </p>
                </div>
              )}
              {treatmentData.socialHistory && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Social History
                  </p>
                  <p className="text-base text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                    {treatmentData.socialHistory}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Objective */}
        {(treatmentData.vitalSigns ||
          treatmentData.clinicalExam ||
          treatmentData.clinicalTests) && (
          <div className="border-b border-gray-200 pb-4">
            <h4 className="text-lg font-semibold text-indigo-700 mb-3">
              Objective
            </h4>
            <div className="space-y-3">
              {treatmentData.vitalSigns && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Vital Signs
                  </p>
                  <div className="bg-gray-50 p-3 rounded">
                    {typeof treatmentData.vitalSigns === "object" ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                        {treatmentData.vitalSigns.temperature && (
                          <div>
                            <span className="font-medium">Temperature: </span>
                            {treatmentData.vitalSigns.temperature}°C
                          </div>
                        )}
                        {treatmentData.vitalSigns.bpSystolic && (
                          <div>
                            <span className="font-medium">BP: </span>
                            {treatmentData.vitalSigns.bpSystolic}/
                            {treatmentData.vitalSigns.bpDiastolic} mmHg
                          </div>
                        )}
                        {treatmentData.vitalSigns.pulseRate && (
                          <div>
                            <span className="font-medium">Pulse: </span>
                            {treatmentData.vitalSigns.pulseRate} bpm
                          </div>
                        )}
                        {treatmentData.vitalSigns.respiratoryRate && (
                          <div>
                            <span className="font-medium">Respiratory: </span>
                            {treatmentData.vitalSigns.respiratoryRate} /min
                          </div>
                        )}
                        {treatmentData.vitalSigns.weight && (
                          <div>
                            <span className="font-medium">Weight: </span>
                            {treatmentData.vitalSigns.weight} kg
                          </div>
                        )}
                        {treatmentData.vitalSigns.height && (
                          <div>
                            <span className="font-medium">Height: </span>
                            {treatmentData.vitalSigns.height} cm
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-base text-gray-900">
                        {treatmentData.vitalSigns}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {treatmentData.clinicalExam &&
                typeof treatmentData.clinicalExam === "object" &&
                treatmentData.clinicalExam.provisionalFindings && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Provisional Findings / Impression
                    </p>
                    <p className="text-base text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                      {treatmentData.clinicalExam.provisionalFindings}
                    </p>
                  </div>
                )}
              {treatmentData.clinicalTests && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Clinical Tests
                  </p>
                  <div className="bg-gray-50 p-3 rounded">
                    {typeof treatmentData.clinicalTests === "object" ? (
                      <div className="text-sm space-y-1">
                        {treatmentData.clinicalTests.pulpVitality && (
                          <div>
                            <span className="font-medium">Pulp Vitality: </span>
                            {treatmentData.clinicalTests.pulpVitality}
                          </div>
                        )}
                        {treatmentData.clinicalTests.percussion && (
                          <div>
                            <span className="font-medium">Percussion: </span>
                            {treatmentData.clinicalTests.percussion}
                          </div>
                        )}
                        {treatmentData.clinicalTests.thermalSensitivity && (
                          <div>
                            <span className="font-medium">
                              Thermal Sensitivity:{" "}
                            </span>
                            {treatmentData.clinicalTests.thermalSensitivity}
                          </div>
                        )}
                        {treatmentData.clinicalTests.mobility && (
                          <div>
                            <span className="font-medium">Mobility: </span>
                            {treatmentData.clinicalTests.mobility}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-base text-gray-900">
                        {treatmentData.clinicalTests}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Assessment */}
        {(treatmentData.diagnosisCode ||
          treatmentData.diagnosis ||
          treatmentData.secondaryDiagnoses ||
          treatmentData.diagnosisNotes) && (
          <div className="border-b border-gray-200 pb-4">
            <h4 className="text-lg font-semibold text-indigo-700 mb-3">
              Assessment
            </h4>
            <div className="space-y-3">
              {treatmentData.diagnosisCode && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Primary Diagnosis
                  </p>
                  <p className="text-base text-gray-900 bg-gray-50 p-3 rounded">
                    <span className="font-semibold">
                      {treatmentData.diagnosisCode}
                    </span>
                    {treatmentData.diagnosis && (
                      <span className="ml-2">- {treatmentData.diagnosis}</span>
                    )}
                  </p>
                </div>
              )}
              {treatmentData.secondaryDiagnoses &&
                Array.isArray(treatmentData.secondaryDiagnoses) &&
                treatmentData.secondaryDiagnoses.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Secondary Diagnoses
                    </p>
                    <div className="bg-gray-50 p-3 rounded">
                      {treatmentData.secondaryDiagnoses.map((diag, idx) => (
                        <span
                          key={idx}
                          className="inline-block bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm mr-2 mb-1"
                        >
                          {diag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              {treatmentData.diagnosisNotes && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Diagnosis Notes
                  </p>
                  <p className="text-base text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                    {treatmentData.diagnosisNotes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Plan */}
        {(treatmentData.treatmentPlan ||
          treatmentData.procedureLogs ||
          treatmentData.affectedTeeth) && (
          <div className="pb-4">
            <h4 className="text-lg font-semibold text-indigo-700 mb-3">Plan</h4>
            <div className="space-y-3">
              {treatmentData.treatmentPlan && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Treatment Plan
                  </p>
                  <p className="text-base text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                    {treatmentData.treatmentPlan}
                  </p>
                </div>
              )}
              {treatmentData.procedureLogs &&
                Array.isArray(treatmentData.procedureLogs) &&
                treatmentData.procedureLogs.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Procedures Performed ({treatmentData.procedureLogs.length}
                      )
                    </p>
                    <div className="bg-gray-50 p-3 rounded space-y-2">
                      {treatmentData.procedureLogs.map((proc, idx) => (
                        <div
                          key={idx}
                          className="border-b border-gray-200 pb-2 last:border-0 last:pb-0"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-gray-900">
                                {proc.code && (
                                  <span className="text-indigo-600">
                                    [{proc.code}]
                                  </span>
                                )}{" "}
                                {proc.description || "Procedure"}
                              </p>
                              {proc.tooth && (
                                <p className="text-sm text-gray-600">
                                  Tooth: {proc.tooth}
                                </p>
                              )}
                              {proc.notes && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {proc.notes}
                                </p>
                              )}
                            </div>
                            {proc.cost && (
                              <p className="text-sm font-medium text-gray-900">
                                ${proc.cost}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              {treatmentData.affectedTeeth &&
                Array.isArray(treatmentData.affectedTeeth) &&
                treatmentData.affectedTeeth.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Affected Teeth
                    </p>
                    <p className="text-base text-gray-900 bg-gray-50 p-3 rounded">
                      {treatmentData.affectedTeeth.join(", ")}
                    </p>
                  </div>
                )}
              {treatmentData.totalCost && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Total Cost
                  </p>
                  <p className="text-lg font-semibold text-gray-900 bg-gray-50 p-3 rounded">
                    ${parseFloat(treatmentData.totalCost).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Post-Treatment */}
        {treatmentData.postTreatment &&
          (treatmentData.postTreatment.painLevel ||
            treatmentData.postTreatment.followUpDate ||
            treatmentData.postTreatment.complications ||
            treatmentData.postTreatment.instructions ||
            treatmentData.postTreatment.medications) && (
            <div className="border-b border-gray-200 pb-4">
              <h4 className="text-lg font-semibold text-indigo-700 mb-3">
                Post-Treatment
              </h4>
              <div className="space-y-3">
                {treatmentData.postTreatment.painLevel && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Pain Level
                    </p>
                    <p className="text-base text-gray-900 bg-gray-50 p-3 rounded">
                      {treatmentData.postTreatment.painLevel}
                    </p>
                  </div>
                )}
                {treatmentData.postTreatment.followUpDate && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Follow-up Date
                    </p>
                    <p className="text-base text-gray-900 bg-gray-50 p-3 rounded">
                      {formatDate(
                        treatmentData.postTreatment.followUpDate,
                        "date"
                      )}
                    </p>
                  </div>
                )}
                {treatmentData.postTreatment.complications && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Complications
                    </p>
                    <p className="text-base text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                      {treatmentData.postTreatment.complications}
                    </p>
                  </div>
                )}
                {treatmentData.postTreatment.instructions && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Post-Care Instructions
                    </p>
                    <p className="text-base text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                      {treatmentData.postTreatment.instructions}
                    </p>
                  </div>
                )}
                {treatmentData.postTreatment.medications && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-1">
                      Medications Prescribed
                    </p>
                    <p className="text-base text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                      {treatmentData.postTreatment.medications}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Additional Notes */}
        {treatmentData.notes && (
          <div className="border-b border-gray-200 pb-4">
            <h4 className="text-lg font-semibold text-indigo-700 mb-3">
              Additional Notes
            </h4>
            <p className="text-base text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">
              {treatmentData.notes}
            </p>
          </div>
        )}

        {/* Treatment Status & Signature */}
        {(treatmentData.status || treatmentData.dentistSignature) && (
          <div className="pb-4">
            <h4 className="text-lg font-semibold text-indigo-700 mb-3">
              Treatment Information
            </h4>
            <div className="space-y-3">
              {treatmentData.status && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Treatment Status
                  </p>
                  <p className="text-base text-gray-900 bg-gray-50 p-3 rounded">
                    {treatmentData.status
                      .split("_")
                      .map(
                        (word) =>
                          word.charAt(0).toUpperCase() +
                          word.slice(1).toLowerCase()
                      )
                      .join(" ")}
                  </p>
                </div>
              )}
              {treatmentData.dentistSignature && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Dentist Signature
                  </p>
                  <p className="text-base text-gray-900 bg-gray-50 p-3 rounded">
                    {treatmentData.dentistSignature}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderXraySection = () => {
    if (!xrayResult || !xrayResult.sentToDentist) {
      return (
        <div className="text-center py-8 text-gray-500">
          {appointment?.xrayId ? (
            <p>X-Ray results are pending or not yet sent by X-Ray doctor.</p>
          ) : (
            <p>No X-Ray was requested for this treatment.</p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* X-Ray Images */}
        {xrayResult.id && (
          <div>
            <h4 className="text-lg font-semibold text-indigo-700 mb-3">
              X-Ray Images
            </h4>
            <XrayImageViewer
              xrayId={xrayResult.id}
              canDelete={false}
              onImagesChange={() => {}}
            />
          </div>
        )}

        {/* X-Ray Details */}
        <div className="space-y-3">
          {xrayResult.xrayType && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                X-Ray Type
              </p>
              <p className="text-base text-gray-900 bg-gray-50 p-3 rounded">
                {xrayResult.xrayType.replace(/_/g, " ")}
              </p>
            </div>
          )}
          {xrayResult.result && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Findings / Notes
              </p>
              <p className="text-base text-gray-900 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                {xrayResult.result}
              </p>
            </div>
          )}
          {xrayResult.technique && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Technique
              </p>
              <p className="text-base text-gray-900 bg-gray-50 p-3 rounded">
                {xrayResult.technique}
              </p>
            </div>
          )}
          {xrayResult.urgency && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Urgency</p>
              <p className="text-base text-gray-900 bg-gray-50 p-3 rounded">
                {xrayResult.urgency}
              </p>
            </div>
          )}
          {xrayResult.teeth &&
            Array.isArray(xrayResult.teeth) &&
            xrayResult.teeth.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Teeth Visible
                </p>
                <p className="text-base text-gray-900 bg-gray-50 p-3 rounded">
                  {xrayResult.teeth.join(", ")}
                </p>
              </div>
            )}
          {xrayResult.createdAt && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">
                Date Received
              </p>
              <p className="text-base text-gray-900 bg-gray-50 p-3 rounded">
                {formatDate(xrayResult.createdAt, "datetime")}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Treatment Details${
        patientData?.name ? ` - ${patientData.name}` : ""
      }`}
      size="xl"
    >
      <div className="space-y-6">
        {/* Patient Info Header */}
        {patientData && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm flex-1">
                <div>
                  <span className="font-medium text-gray-700">Patient: </span>
                  <span className="text-gray-900">
                    {patientData.name || appointment?.patientName}
                  </span>
                </div>
                {patientData.phone && (
                  <div>
                    <span className="font-medium text-gray-700">Phone: </span>
                    <span className="text-gray-900">{patientData.phone}</span>
                  </div>
                )}
                {appointment?.date && (
                  <div>
                    <span className="font-medium text-gray-700">Date: </span>
                    <span className="text-gray-900">
                      {formatDate(appointment.date, "datetime")}
                    </span>
                  </div>
                )}
                {appointment?.dentist?.name && (
                  <div>
                    <span className="font-medium text-gray-700">Dentist: </span>
                    <span className="text-gray-900">
                      {appointment.dentist.name}
                    </span>
                  </div>
                )}
              </div>
              {/* Edit Treatment Button */}
              {appointment?.id && (
                <button
                  onClick={handleEditTreatment}
                  className="ml-4 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                >
                  ✏️ {treatmentData ? "Edit Treatment" : "Add Treatment"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveSection("soap")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeSection === "soap"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              SOAP Details
            </button>
            <button
              onClick={() => setActiveSection("xray")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeSection === "xray"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              X-Ray Results
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="min-h-[400px] max-h-[600px] overflow-y-auto">
          {activeSection === "soap" && renderSOAPSection()}
          {activeSection === "xray" && renderXraySection()}
        </div>
      </div>
    </Modal>
  );
};

export default TreatmentDetailModal;
