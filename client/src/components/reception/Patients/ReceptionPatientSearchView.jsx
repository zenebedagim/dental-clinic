import { useState, useEffect } from "react";
import PatientSearch from "../../common/PatientSearch";
import DataTable from "../../common/DataTable";
import PatientHistoryModal from "./PatientHistoryModal";
import usePatient from "../../../hooks/usePatient";
import { formatDate } from "../../../utils/tableUtils";
import { useToast } from "../../../hooks/useToast";

const ReceptionPatientSearchView = () => {
  const { patients, refreshPatients, setSelectedPatient } = usePatient();
  const { success: showSuccess } = useToast();

  const [loading, setLoading] = useState(false);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [selectedPatient, setSelectedPatientLocal] = useState(null);
  const [showTable, setShowTable] = useState(false);

  // Listen for appointment creation events to auto-refresh patient list and details
  useEffect(() => {
    const handleAppointmentCreated = async () => {
      try {
        // Refresh patients from context when new appointment creates patient
        await refreshPatients();
        // If table is already showing, update it with fresh data
        // The patients from context will be updated automatically
        if (showTable) {
          showSuccess("Patient information updated");
        }
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
  }, [showTable, selectedPatient]);

  // Update filtered patients when context patients change
  useEffect(() => {
    if (showTable && patients.length > 0) {
      setFilteredPatients(patients);
    }
  }, [patients, showTable]);

  const fetchAllPatients = async () => {
    try {
      setLoading(true);
      // Refresh patients from context
      await refreshPatients();
      setFilteredPatients(patients);
      setShowTable(true);
    } catch (err) {
      console.error("Error fetching patients:", err);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      searchable: true,
    },
    {
      key: "phone",
      label: "Phone",
      sortable: true,
      searchable: true,
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      searchable: true,
      render: (value) => value || "—",
    },
    {
      key: "gender",
      label: "Gender",
      sortable: true,
      render: (value) => value || "—",
    },
    {
      key: "dateOfBirth",
      label: "Date of Birth",
      sortable: true,
      render: (value) => (value ? formatDate(value) : "—"),
    },
    {
      key: "address",
      label: "Address",
      render: (value) =>
        value
          ? value.length > 30
            ? value.substring(0, 30) + "..."
            : value
          : "—",
    },
  ];

  const actions = [
    {
      label: "View History",
      icon: "📋",
      variant: "primary",
      onClick: (patient) => {
        setSelectedPatient(patient);
        setSelectedPatientLocal(patient);
      },
    },
    {
      label: "Create Appointment",
      icon: "➕",
      variant: "primary",
      onClick: (patient) => {
        // Navigate to appointment form with patient pre-selected
        window.location.href = `/reception/appointments/new?patientId=${patient.id}`;
      },
    },
  ];

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

      {/* View All Patients Button */}
      <div className="p-4 bg-white rounded-lg shadow-md">
        <button
          onClick={fetchAllPatients}
          disabled={loading}
          className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium min-h-[44px] disabled:opacity-50"
        >
          {loading ? "Loading..." : "View All Patients"}
        </button>
      </div>

      {/* Patients Table */}
      {showTable && (
        <div className="p-4 bg-white rounded-lg shadow-md">
          <DataTable
            data={
              filteredPatients.length > 0 ? filteredPatients : patients || []
            }
            columns={columns}
            actions={actions}
            title="Patients"
            emptyMessage="No patients found"
            pageSize={10}
            searchable={true}
            sortable={true}
            pagination={true}
            exportable={true}
            printable={true}
          />
        </div>
      )}

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
