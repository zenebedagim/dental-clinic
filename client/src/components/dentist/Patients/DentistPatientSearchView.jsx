import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import Modal from "../../common/Modal";

const DentistPatientSearchView = () => {
  const { selectedBranch } = useBranch();
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  const fetchAllPatients = useCallback(async () => {
    try {
      setLoading(true);
      // Build params object, only including branchId if it exists
      const params = {
        limit: 1000, // Fetch a large number of patients
      };
      if (selectedBranch?.id) {
        params.branchId = selectedBranch.id;
      }

      const response = await api.get("/patients", { params });
      const patientsData = response.data?.data || response.data || [];
      setPatients(patientsData);
      setFilteredPatients(patientsData);
    } catch (err) {
      console.error("Error fetching patients:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      setPatients([]);
      setFilteredPatients([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  // Fetch all patients on component mount
  useEffect(() => {
    fetchAllPatients();
  }, [fetchAllPatients]);

  // Filter patients based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPatients(patients);
    } else {
      const queryLower = searchQuery.toLowerCase();
      const filtered = patients.filter(
        (p) =>
          p.name?.toLowerCase().includes(queryLower) ||
          p.phone?.includes(searchQuery) ||
          p.email?.toLowerCase().includes(queryLower) ||
          p.cardNo?.includes(searchQuery)
      );
      setFilteredPatients(filtered);
    }
  }, [searchQuery, patients]);

  const fetchPatientHistory = useCallback(
    async (patientId) => {
      try {
        setLoadingHistory(true);
        const response = await api.get(`/history/patient/${patientId}`, {
          params: { branchId: selectedBranch?.id },
        });
        const history = response.data?.data || response.data || {};
        setPatientHistory(history);
      } catch (err) {
        console.error("Error fetching patient history:", err);
        setPatientHistory(null);
      } finally {
        setLoadingHistory(false);
      }
    },
    [selectedBranch]
  );

  const handlePatientClick = async (patient) => {
    setSelectedPatient(patient);
    setHistoryModalOpen(true);
    await fetchPatientHistory(patient.id);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!selectedBranch) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Patient Search & History
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Search for patient records and view complete history
          </p>
        </div>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Please select a branch to view patients.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Patient Search & History
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">
          View all patient records and search to filter. Click on any patient to
          view complete history.
        </p>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, email, or card number..."
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-500">
          {filteredPatients.length} patient
          {filteredPatients.length !== 1 ? "s" : ""} found
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      </div>

      {/* Patients List */}
      <div className="bg-white rounded-lg shadow-md">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-gray-500">Loading patients...</p>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery
              ? "No patients found matching your search."
              : "No patients found."}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPatients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => handlePatientClick(patient)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {patient.name || "Unknown"}
                    </h3>
                    <div className="mt-1 space-y-1">
                      {patient.phone && (
                        <p className="text-sm text-gray-600">
                          📞 {patient.phone}
                        </p>
                      )}
                      {patient.email && (
                        <p className="text-sm text-gray-600">
                          ✉️ {patient.email}
                        </p>
                      )}
                      {patient.cardNo && (
                        <p className="text-sm text-gray-600">
                          🆔 Card: {patient.cardNo}
                        </p>
                      )}
                      {patient.dateOfBirth && (
                        <p className="text-sm text-gray-600">
                          🎂 DOB:{" "}
                          {new Date(patient.dateOfBirth).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <span className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                      View History →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Patient History Modal */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setSelectedPatient(null);
          setPatientHistory(null);
        }}
        title={`Patient History: ${selectedPatient?.name || ""}`}
        size="xl"
      >
        {loadingHistory ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="mt-2 text-gray-500">Loading patient history...</p>
          </div>
        ) : patientHistory ? (
          <div className="space-y-6">
            {/* Patient Info */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="font-semibold text-gray-900 mb-2">
                Patient Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>{" "}
                  <span className="font-medium">{selectedPatient?.name}</span>
                </div>
                {selectedPatient?.phone && (
                  <div>
                    <span className="text-gray-600">Phone:</span>{" "}
                    <span className="font-medium">{selectedPatient.phone}</span>
                  </div>
                )}
                {selectedPatient?.email && (
                  <div>
                    <span className="text-gray-600">Email:</span>{" "}
                    <span className="font-medium">{selectedPatient.email}</span>
                  </div>
                )}
                {selectedPatient?.dateOfBirth && (
                  <div>
                    <span className="text-gray-600">Date of Birth:</span>{" "}
                    <span className="font-medium">
                      {new Date(
                        selectedPatient.dateOfBirth
                      ).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {selectedPatient?.cardNo && (
                  <div>
                    <span className="text-gray-600">Card No:</span>{" "}
                    <span className="font-medium">
                      {selectedPatient.cardNo}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Past Appointments */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                Past Appointments
              </h3>
              {patientHistory.appointments &&
              patientHistory.appointments.length > 0 ? (
                <div className="space-y-3">
                  {patientHistory.appointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="border border-gray-200 rounded-md p-4"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-gray-900">
                            {formatDate(appointment.date)}
                          </div>
                          <div className="text-sm text-gray-600">
                            Dentist: {appointment.dentist?.name || "N/A"}
                          </div>
                          {appointment.visitReason && (
                            <div className="text-sm text-gray-600 mt-1">
                              Reason: {appointment.visitReason}
                            </div>
                          )}
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            appointment.status === "COMPLETED"
                              ? "bg-green-100 text-green-800"
                              : appointment.status === "CANCELLED"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {appointment.status}
                        </span>
                      </div>
                      {appointment.treatment && (
                        <div className="mt-2 text-sm text-blue-600">
                          ✓ Treatment completed
                        </div>
                      )}
                      {appointment.xrayResult && (
                        <div className="mt-2 text-sm text-purple-600">
                          ✓ X-Ray results available
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No past appointments</p>
              )}
            </div>

            {/* Treatments */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Treatments</h3>
              {patientHistory.treatments &&
              patientHistory.treatments.length > 0 ? (
                <div className="space-y-3">
                  {patientHistory.treatments.map((treatment) => (
                    <div
                      key={treatment.id}
                      className="border border-gray-200 rounded-md p-4"
                    >
                      <div className="font-medium text-gray-900 mb-2">
                        {formatDate(treatment.createdAt)}
                      </div>
                      {treatment.diagnosis && (
                        <div className="text-sm text-gray-600 mb-1">
                          Diagnosis: {treatment.diagnosis}
                        </div>
                      )}
                      {treatment.diagnosisCode && (
                        <div className="text-sm text-gray-600 mb-1">
                          Code: {treatment.diagnosisCode}
                        </div>
                      )}
                      {treatment.procedureLogs &&
                        Array.isArray(treatment.procedureLogs) &&
                        treatment.procedureLogs.length > 0 && (
                          <div className="text-sm text-gray-600">
                            Procedures: {treatment.procedureLogs.length}{" "}
                            procedure(s)
                          </div>
                        )}
                      {treatment.status && (
                        <div className="mt-2">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              treatment.status === "COMPLETED"
                                ? "bg-green-100 text-green-800"
                                : treatment.status === "IN_PROGRESS"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {treatment.status}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No treatments recorded</p>
              )}
            </div>

            {/* X-Ray Results */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                X-Ray Results
              </h3>
              {patientHistory.xrayResults &&
              patientHistory.xrayResults.length > 0 ? (
                <div className="space-y-3">
                  {patientHistory.xrayResults.map((xray) => (
                    <div
                      key={xray.id}
                      className="border border-gray-200 rounded-md p-4"
                    >
                      <div className="font-medium text-gray-900 mb-2">
                        {formatDate(xray.createdAt)}
                      </div>
                      {xray.xrayType && (
                        <div className="text-sm text-gray-600 mb-1">
                          Type: {xray.xrayType.replace(/_/g, " ")}
                        </div>
                      )}
                      {xray.urgency && (
                        <div className="text-sm text-gray-600 mb-1">
                          Urgency: {xray.urgency}
                        </div>
                      )}
                      {xray.sentToDentist && (
                        <div className="mt-2 text-sm text-green-600">
                          ✓ Sent to dentist
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No X-Ray results</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No history available
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DentistPatientSearchView;
