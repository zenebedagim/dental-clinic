import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import PatientList from "./PatientList";
import TreatmentHistoryTable from "./TreatmentHistoryTable";
import TreatmentDetailModal from "./TreatmentDetailModal";

const DentistPatientsView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedBranch } = useBranch();
  const filterType = location.state?.filter || null; // 'pending', 'inProgress', 'completed', or null
  const initialSearchMode = location.state?.searchMode || false; // Enable search mode from navigation
  const patientIdFromState = location.state?.patientId || null; // Patient ID from navigation state
  const patientNameFromState = location.state?.patientName || null; // Patient name from navigation state
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // 'list' or 'history'
  const [patientHistory, setPatientHistory] = useState(null);
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  const [treatmentModalOpen, setTreatmentModalOpen] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [forceSearchMode, setForceSearchMode] = useState(false); // Force Search All Patients mode
  const patientIdProcessedRef = useRef(false); // Track if we've processed the patientId from state
  const [errorMessage, setErrorMessage] = useState(null); // Error message for display

  const handleViewHistory = useCallback(
    async (appointment) => {
      // #region agent log
      fetch(
        "http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "DentistPatientsView.jsx:26",
            message: "handleViewHistory called",
            data: {
              appointmentId: appointment?.id,
              appointmentPatientId: appointment?.patientId,
              appointmentPatientName: appointment?.patientName,
              appointmentPatient: appointment?.patient,
              treatmentPatientId:
                appointment?.treatment?.patientId ||
                appointment?.treatments?.[0]?.patientId,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "H1",
          }),
        }
      ).catch(() => {});
      // #endregion

      // Try to get patientId from various locations
      let patientId =
        appointment?.patientId ||
        appointment?.patient?.id ||
        selectedPatient?.patientId ||
        selectedPatient?.patient?.id;

      // If patientId is still null, try to get it from treatment data
      if (!patientId) {
        const treatment =
          appointment?.treatment ||
          (appointment?.treatments && appointment.treatments.length > 0
            ? appointment.treatments[0]
            : null);
        patientId = treatment?.patientId || treatment?.patient?.id;
      }

      // #region agent log
      fetch(
        "http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            location: "DentistPatientsView.jsx:43",
            message: "patientId extracted",
            data: {
              patientId,
              appointmentPatientName: appointment?.patientName,
              hasPatientId: !!patientId,
            },
            timestamp: Date.now(),
            sessionId: "debug-session",
            runId: "run1",
            hypothesisId: "H1",
          }),
        }
      ).catch(() => {});
      // #endregion

      // If still no patientId, try to search for patient by name (exact match first, then partial)
      if (!patientId && appointment?.patientName) {
        try {
          const patientName = appointment.patientName.trim();

          // Try exact match first
          let searchResponse = await api.get("/patients/search", {
            params: { name: patientName, limit: 10 },
          });
          let patients = searchResponse.data?.data || searchResponse.data || [];

          // Try to find exact match (case-insensitive)
          let foundPatient = patients.find(
            (p) => p.name?.toLowerCase() === patientName.toLowerCase()
          );

          // If no exact match, use first result if available
          if (!foundPatient && patients.length > 0) {
            foundPatient = patients[0];
          }

          if (foundPatient) {
            patientId = foundPatient.id;
            // #region agent log
            fetch(
              "http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  location: "DentistPatientsView.jsx:66",
                  message: "patient found by name search",
                  data: {
                    searchedName: patientName,
                    foundPatientId: foundPatient.id,
                    foundPatientName: foundPatient.name,
                    allPatientsFound: patients.map((p) => ({
                      id: p.id,
                      name: p.name,
                    })),
                  },
                  timestamp: Date.now(),
                  sessionId: "debug-session",
                  runId: "run1",
                  hypothesisId: "H1",
                }),
              }
            ).catch(() => {});
            // #endregion
            console.log(
              `✅ Found patient by name search: ${foundPatient.name} (ID: ${patientId})`
            );
          } else {
            // #region agent log
            fetch(
              "http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  location: "DentistPatientsView.jsx:72",
                  message: "patient NOT found by name search",
                  data: {
                    searchedName: patientName,
                    patientsFound: patients.length,
                    allPatientsFound: patients.map((p) => ({
                      id: p.id,
                      name: p.name,
                    })),
                  },
                  timestamp: Date.now(),
                  sessionId: "debug-session",
                  runId: "run1",
                  hypothesisId: "H1",
                }),
              }
            ).catch(() => {});
            // #endregion
            console.warn(
              `⚠️ Patient search returned no results for: "${patientName}"`
            );
          }
        } catch (searchErr) {
          console.error("Error searching for patient:", searchErr);
        }
      }

      if (!patientId) {
        // Log warning for data consistency issue
        console.warn(
          "⚠️ Data consistency issue: Appointment missing patientId",
          {
            appointmentId: appointment?.id,
            patientName: appointment?.patientName,
            appointment: appointment,
          }
        );

        // Show user-friendly error message
        setErrorMessage(
          `Unable to load patient history: This appointment (${appointment?.id?.substring(
            0,
            8
          )}...) is not properly linked to a patient. Please contact support to fix this data issue.`
        );
        setViewMode("list"); // Stay in list view
        return;
      }

      // Clear any previous error messages
      setErrorMessage(null);

      // Set the selected patient/appointment for display
      setSelectedPatient(appointment || selectedPatient);
      setViewMode("history");
      setLoadingHistory(true);

      try {
        // Fetch complete patient history including all treatments, appointments, and X-ray results
        const response = await api.get(`/history/patient/${patientId}`, {
          params: { branchId: selectedBranch?.id },
        });

        // Handle both response formats: { data: {...} } or direct object
        const history = response.data?.data || response.data || {};

        // #region agent log
        fetch(
          "http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "DentistPatientsView.jsx:121",
              message: "patient history received",
              data: {
                treatmentsCount: (history.treatments || []).length,
                appointmentsCount: (history.appointments || []).length,
                xrayResultsCount: (history.xrayResults || []).length,
                patientId,
                branchId: selectedBranch?.id,
                sampleAppointments: (history.appointments || [])
                  .slice(0, 3)
                  .map((apt) => ({
                    id: apt.id,
                    date: apt.date,
                    patientName: apt.patientName,
                    branchId: apt.branchId,
                  })),
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "H1",
            }),
          }
        ).catch(() => {});
        // #endregion

        // #region agent log
        fetch(
          "http://127.0.0.1:7244/ingest/f137231e-699b-4ef5-9328-810bb022ad2f",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              location: "DentistPatientsView.jsx:147",
              message: "setting patient history",
              data: {
                patientId,
                appointmentPatientName: appointment?.patientName,
                historyPatientName:
                  history.patient?.name ||
                  appointment?.patient?.name ||
                  appointment?.patientName,
                treatmentsCount: (history.treatments || []).length,
                appointmentsCount: (history.appointments || []).length,
                sampleAppointmentPatientNames: (history.appointments || [])
                  .slice(0, 3)
                  .map((apt) => apt.patientName),
              },
              timestamp: Date.now(),
              sessionId: "debug-session",
              runId: "run1",
              hypothesisId: "H1",
            }),
          }
        ).catch(() => {});
        // #endregion

        // Ensure we have all the history data - combine treatments and appointments
        // Use the patient from history response, or fallback to appointment patient
        const patientData = history.patient ||
          appointment?.patient || {
            id: patientId,
            name: appointment?.patientName || "Unknown Patient",
          };

        // Link X-Ray results to appointments by xrayId (for direct appointment X-Ray requests)
        const xrayResults = history.xrayResults || [];
        const appointmentsWithXray = (history.appointments || []).map((apt) => {
          if (apt.xrayId) {
            const linkedXray = xrayResults.find(
              (xray) => xray.id === apt.xrayId || xray.appointmentId === apt.id
            );
            if (linkedXray) {
              return { ...apt, xrayResult: linkedXray };
            }
          }
          return apt;
        });

        // Sort treatments by sequence number (1st, 2nd, 3rd, etc.)
        const sortedTreatments = [...(history.treatments || [])].sort(
          (a, b) => {
            const aSeq = a.treatmentNumber || a.treatmentSequence || 0;
            const bSeq = b.treatmentNumber || b.treatmentSequence || 0;
            if (aSeq !== bSeq) return aSeq - bSeq;
            // If same sequence, sort by creation date
            const aDate = new Date(a.createdAt || a.date || 0);
            const bDate = new Date(b.createdAt || b.date || 0);
            return aDate - bDate;
          }
        );

        // Sort X-Ray results by creation date (oldest first) to match with treatment sequence
        const sortedXrayResults = [...xrayResults].sort((a, b) => {
          const aDate = new Date(a.createdAt || 0);
          const bDate = new Date(b.createdAt || 0);
          return aDate - bDate;
        });

        // Link X-Ray results to treatments by sequence order: 1st treatment → 1st X-Ray, 2nd → 2nd, etc.
        const treatmentsWithXray = sortedTreatments.map((treatment, index) => {
          // Get the X-Ray result at the same index position
          const matchedXray = sortedXrayResults[index] || null;

          // Find the appointment associated with this treatment
          const associatedAppointment = appointmentsWithXray.find(
            (apt) =>
              apt.id === treatment.appointmentId ||
              apt.treatment?.id === treatment.id ||
              apt.treatments?.some((t) => t.id === treatment.id)
          );

          // Use matched X-Ray by sequence, or fall back to appointment's X-Ray if available
          const xrayToUse =
            matchedXray || associatedAppointment?.xrayResult || null;

          if (xrayToUse) {
            return {
              ...treatment,
              xrayResult: xrayToUse,
              appointment: {
                ...(treatment.appointment || associatedAppointment || {}),
                xrayResult: xrayToUse,
              },
            };
          } else if (associatedAppointment) {
            return {
              ...treatment,
              appointment: {
                ...(treatment.appointment || associatedAppointment),
              },
            };
          }
          return treatment;
        });

        setPatientHistory({
          treatments: treatmentsWithXray,
          appointments: appointmentsWithXray,
          xrayResults: xrayResults,
          patient: patientData,
        });
      } catch (err) {
        console.error("Error fetching patient history:", err);
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Failed to load patient history";
        setErrorMessage(`Error loading history: ${errorMsg}`);
        setPatientHistory(null);
        setViewMode("list"); // Return to list view on error
      } finally {
        setLoadingHistory(false);
      }
    },
    [selectedBranch, selectedPatient]
  );

  const handleTreatmentSelect = async (treatmentOrAppointment) => {
    // When clicking on a treatment in TreatmentHistoryTable, fetch full data and open the modal
    try {
      // First, check if the treatment already has X-Ray linked from patient history
      // (This happens when we link them by sequence during history loading)
      const treatment =
        treatmentOrAppointment.treatment || treatmentOrAppointment;
      let xrayResultFromHistory =
        treatment.xrayResult ||
        treatmentOrAppointment.xrayResult ||
        treatmentOrAppointment.appointment?.xrayResult;

      // If not found, try to match by sequence: 1st treatment → 1st X-Ray, 2nd → 2nd, etc.
      if (
        !xrayResultFromHistory &&
        patientHistory?.treatments &&
        patientHistory?.xrayResults
      ) {
        const treatmentSeq =
          treatment.treatmentNumber || treatment.treatmentSequence;

        // Sort treatments and X-Ray results by sequence/date
        const sortedTreatments = [...patientHistory.treatments].sort((a, b) => {
          const aSeq = a.treatmentNumber || a.treatmentSequence || 0;
          const bSeq = b.treatmentNumber || b.treatmentSequence || 0;
          if (aSeq !== bSeq) return aSeq - bSeq;
          const aDate = new Date(a.createdAt || a.date || 0);
          const bDate = new Date(b.createdAt || b.date || 0);
          return aDate - bDate;
        });

        const sortedXrayResults = [...patientHistory.xrayResults].sort(
          (a, b) => {
            const aDate = new Date(a.createdAt || 0);
            const bDate = new Date(b.createdAt || 0);
            return aDate - bDate;
          }
        );

        // Find the index of this treatment
        const treatmentIndex = sortedTreatments.findIndex(
          (t) =>
            t.id === treatment.id ||
            (treatmentSeq &&
              (t.treatmentNumber === treatmentSeq ||
                t.treatmentSequence === treatmentSeq)) ||
            (!treatmentSeq && t === treatment)
        );

        // Get X-Ray at the same index (1st treatment → 1st X-Ray, 2nd → 2nd, etc.)
        if (treatmentIndex >= 0 && sortedXrayResults[treatmentIndex]) {
          xrayResultFromHistory = sortedXrayResults[treatmentIndex];
        }
      }

      // Get appointment ID from the item
      const appointmentId =
        treatmentOrAppointment.appointment?.id || treatmentOrAppointment.id;

      if (appointmentId) {
        try {
          // Fetch full appointment data with treatment and X-ray results
          const response = await api.get(`/appointments/${appointmentId}`, {
            params: { branchId: selectedBranch?.id },
          });

          const fullAppointment = response.data?.data || response.data;

          // Merge with existing data to preserve any additional fields
          const completeData = {
            ...treatmentOrAppointment,
            ...fullAppointment,
            // Ensure treatment data is included
            treatment:
              fullAppointment.treatment ||
              treatmentOrAppointment.treatment ||
              (fullAppointment.treatments &&
              fullAppointment.treatments.length > 0
                ? fullAppointment.treatments[0]
                : null),
            // Ensure X-ray result is included (prioritize fetched data, then history, then existing)
            xrayResult:
              fullAppointment.xrayResult ||
              xrayResultFromHistory ||
              treatmentOrAppointment.xrayResult ||
              treatmentOrAppointment.appointment?.xrayResult,
            // Preserve appointment reference with X-Ray result
            appointment: {
              ...(fullAppointment.appointment || fullAppointment),
              xrayResult:
                fullAppointment.xrayResult ||
                xrayResultFromHistory ||
                fullAppointment.appointment?.xrayResult,
            },
          };

          setSelectedTreatment(completeData);
        } catch (fetchErr) {
          // If fetch fails (404, etc.), use data from patient history
          // Only log if it's not a 404 (expected for some appointments)
          if (fetchErr.response?.status !== 404) {
            console.warn(
              "Could not fetch appointment details, using history data:",
              fetchErr
            );
          }

          const completeData = {
            ...treatmentOrAppointment,
            // Ensure X-ray result is included from history
            xrayResult:
              xrayResultFromHistory ||
              treatmentOrAppointment.xrayResult ||
              treatmentOrAppointment.appointment?.xrayResult,
            // Preserve appointment reference with X-Ray result
            appointment: treatmentOrAppointment.appointment
              ? {
                  ...treatmentOrAppointment.appointment,
                  xrayResult:
                    xrayResultFromHistory ||
                    treatmentOrAppointment.appointment.xrayResult,
                }
              : {
                  ...treatmentOrAppointment,
                  xrayResult:
                    xrayResultFromHistory || treatmentOrAppointment.xrayResult,
                },
          };

          setSelectedTreatment(completeData);
        }
      } else {
        // If no appointment ID, use the data as-is but try to add X-Ray from history
        const completeData = {
          ...treatmentOrAppointment,
          xrayResult:
            xrayResultFromHistory ||
            treatmentOrAppointment.xrayResult ||
            treatmentOrAppointment.appointment?.xrayResult,
        };
        setSelectedTreatment(completeData);
      }
      setTreatmentModalOpen(true);
    } catch (err) {
      console.error("Error fetching treatment details:", err);
      // On error, still open modal with available data
      setSelectedTreatment(treatmentOrAppointment);
      setTreatmentModalOpen(true);
    }
  };

  const handleCloseTreatmentModal = () => {
    setTreatmentModalOpen(false);
    setSelectedTreatment(null);
  };

  const handleBackToList = () => {
    setViewMode("list");
    setPatientHistory(null);
    setSelectedPatient(null);
    setErrorMessage(null); // Clear errors when going back
    setForceSearchMode(true); // Enable Search All Patients mode when going back
  };

  const handleAddNewTreatment = () => {
    // Get appointments for this patient
    const appointments = patientHistory?.appointments || [];
    const patientId =
      patientHistory?.patient?.id ||
      selectedPatient?.patientId ||
      selectedPatient?.patient?.id;

    if (!patientId) {
      setErrorMessage("Cannot add treatment: Patient ID is missing");
      return;
    }

    // Find the most recent appointment that doesn't have a treatment yet
    // This allows adding multiple treatments to the same appointment
    // Sort appointments by date (most recent first)
    const sortedAppointments = [...appointments].sort((a, b) => {
      return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
    });

    // Try to find an appointment without a treatment first
    let appointmentForTreatment = sortedAppointments.find((apt) => {
      // Check if this appointment has a treatment
      const hasTreatment =
        (apt.treatments && apt.treatments.length > 0) || apt.treatment;
      return !hasTreatment;
    });

    // If all appointments have treatments, use the most recent one
    // This allows adding multiple treatments (1st, 2nd, 3rd, etc.) to the same appointment
    if (!appointmentForTreatment && sortedAppointments.length > 0) {
      appointmentForTreatment = sortedAppointments[0];
    }

    // If no appointments exist, we need to create one first
    // For now, show an error - in the future, we could auto-create an appointment
    if (!appointmentForTreatment) {
      setErrorMessage(
        "Cannot add treatment: No appointment found. Please create an appointment first from the reception module."
      );
      return;
    }

    // Create a clean appointment object WITHOUT treatment data
    // This ensures the treatment form starts fresh with only patient identity
    const cleanAppointment = {
      id: appointmentForTreatment.id,
      patientId: appointmentForTreatment.patientId || patientId,
      patientName:
        appointmentForTreatment.patientName ||
        patientHistory?.patient?.name ||
        selectedPatient?.patientName ||
        selectedPatient?.patient?.name,
      patient: appointmentForTreatment.patient ||
        patientHistory?.patient || {
          id: patientId,
          name:
            patientHistory?.patient?.name ||
            selectedPatient?.patientName ||
            selectedPatient?.patient?.name,
        },
      branchId: appointmentForTreatment.branchId || selectedBranch?.id,
      dentistId: appointmentForTreatment.dentistId,
      dentist: appointmentForTreatment.dentist,
      date: appointmentForTreatment.date,
      visitReason: appointmentForTreatment.visitReason,
      status: appointmentForTreatment.status,
      // Explicitly exclude treatment data to ensure fresh form
      treatment: undefined,
      treatments: undefined,
    };

    // Navigate to treatment page with clean appointment data (no treatment pre-filled)
    navigate("/dentist/treatment", {
      state: {
        appointment: cleanAppointment,
      },
    });
  };

  // Auto-load patient history if patientId is provided in location state (from treatment save)
  useEffect(() => {
    if (
      patientIdFromState &&
      selectedBranch?.id &&
      !patientIdProcessedRef.current
    ) {
      patientIdProcessedRef.current = true; // Mark as processed

      // Set search mode first, then load patient history after a short delay
      // This ensures PatientList has time to load patients
      setForceSearchMode(true);

      // Wait a bit for PatientList to load, then show patient history
      setTimeout(() => {
        const patientAppointment = {
          patientId: patientIdFromState,
          patientName: patientNameFromState,
          patient: { id: patientIdFromState, name: patientNameFromState },
        };
        setSelectedPatient(patientAppointment);
        setViewMode("history");
        handleViewHistory(patientAppointment);
      }, 1500); // Give PatientList time to fetch patients
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientIdFromState, patientNameFromState, selectedBranch]);

  // Listen for treatment saved events to refresh history
  useEffect(() => {
    const handleTreatmentSaved = (event) => {
      const { patientId, patientName, appointment } = event.detail || {};

      // If we're in history view and it's the same patient, refresh
      if (viewMode === "history" && selectedPatient) {
        const currentPatientId =
          selectedPatient?.patientId || selectedPatient?.patient?.id;
        if (currentPatientId === patientId) {
          handleViewHistory(selectedPatient);
        }
      } else if (patientId) {
        // If we're in list view, switch to history view for this patient
        const patientAppointment = appointment || {
          patientId: patientId,
          patientName: patientName,
          patient: { id: patientId, name: patientName },
        };
        setSelectedPatient(patientAppointment);
        setViewMode("history");
        handleViewHistory(patientAppointment);
      }
    };

    window.addEventListener("treatment-saved", handleTreatmentSaved);
    return () => {
      window.removeEventListener("treatment-saved", handleTreatmentSaved);
    };
  }, [viewMode, selectedPatient, handleViewHistory]);

  return (
    <div className="relative">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {viewMode === "history"
                ? `Patient History${
                    selectedPatient?.patient?.name ||
                    selectedPatient?.patientName
                      ? ` - ${
                          selectedPatient?.patient?.name ||
                          selectedPatient?.patientName
                        }`
                      : ""
                  }`
                : "My Patients"}
            </h1>
            <p className="mt-2 text-sm text-gray-600 sm:text-base">
              {viewMode === "history"
                ? "View complete treatment history and X-ray results"
                : "View and select appointments for treatment"}
            </p>
          </div>
          {viewMode === "history" && (
            <div className="flex gap-2">
              <button
                onClick={handleAddNewTreatment}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                ➕ Add New Treatment
              </button>
              <button
                onClick={handleBackToList}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                ← Back to List
              </button>
            </div>
          )}
        </div>

        {/* Error Message Display */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Data Issue Detected
                </h3>
                <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {viewMode === "list" ? (
          <PatientList
            filterType={filterType}
            onViewHistory={handleViewHistory}
            initialSearchMode={forceSearchMode || initialSearchMode}
            autoSearchPatientId={patientIdFromState}
            autoSearchPatientName={patientNameFromState}
          />
        ) : (
          <div>
            {loadingHistory ? (
              <div className="py-12 text-center">
                <div className="inline-block w-8 h-8 border-b-2 border-indigo-600 rounded-full animate-spin"></div>
                <p className="mt-2 text-gray-500">Loading patient history...</p>
              </div>
            ) : patientHistory ? (
              <TreatmentHistoryTable
                treatments={patientHistory.treatments || []}
                appointments={patientHistory.appointments || []}
                onTreatmentSelect={handleTreatmentSelect}
              />
            ) : (
              <div className="p-6 bg-white rounded-lg shadow-md">
                <p className="py-8 text-center text-gray-500">
                  No patient history available
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Treatment Detail Modal - Opens when clicking on a treatment in TreatmentHistoryTable */}
      <TreatmentDetailModal
        isOpen={treatmentModalOpen}
        onClose={handleCloseTreatmentModal}
        treatment={selectedTreatment?.treatment || selectedTreatment}
        appointment={selectedTreatment}
        patient={
          selectedPatient?.patient ||
          selectedPatient ||
          selectedTreatment?.patient
        }
      />
    </div>
  );
};

export default DentistPatientsView;
