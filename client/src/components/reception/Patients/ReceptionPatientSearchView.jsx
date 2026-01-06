import { useState, useEffect } from "react";
import PatientSearch from "../../common/PatientSearch";
import PatientHistoryModal from "./PatientHistoryModal";
import usePatient from "../../../hooks/usePatient";
import { useToast } from "../../../hooks/useToast";

const ReceptionPatientSearchView = () => {
  const {
    refreshPatients,
    setSelectedPatient,
    selectedPatient: contextSelectedPatient,
  } = usePatient();
  const { success: showSuccess } = useToast();

  const [selectedPatient, setSelectedPatientLocal] = useState(null);

  // Sync context selectedPatient with local state
  useEffect(() => {
    if (contextSelectedPatient && contextSelectedPatient.id) {
      // Only update if different patient to avoid loops
      if (
        !selectedPatient ||
        selectedPatient.id !== contextSelectedPatient.id
      ) {
        setSelectedPatientLocal(contextSelectedPatient);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contextSelectedPatient]);

  // Listen for appointment creation events to auto-refresh patient details
  useEffect(() => {
    const handleAppointmentCreated = async () => {
      try {
        // Refresh patients from context when new appointment creates patient
        await refreshPatients();
        // If a patient is selected, refresh their details too
        if (selectedPatient?.id) {
          // Trigger refresh of selected patient's information
          // The PatientHistoryModal will auto-refresh via its own listener
          showSuccess("Patient details updated");
        }
      } catch (err) {
        console.error("Error refreshing patients:", err);
      }
    };

    window.addEventListener("appointment-created", handleAppointmentCreated);
    return () => {
      window.removeEventListener(
        "appointment-created",
        handleAppointmentCreated
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatient]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Patient Search & History
        </h1>
        <p className="mt-2 text-sm text-gray-600 sm:text-base">
          Search for patient records and view complete history
        </p>
      </div>

      {/* Quick Search */}
      <PatientSearch />

      {/* Patient History Modal */}
      <PatientHistoryModal
        isOpen={!!selectedPatient}
        onClose={() => {
          setSelectedPatientLocal(null);
          setSelectedPatient(null);
        }}
        patient={selectedPatient || null}
      />
    </div>
  );
};

export default ReceptionPatientSearchView;
