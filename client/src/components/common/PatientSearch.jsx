import { useState, useEffect, useRef, memo } from "react";
import api from "../../services/api";
import useBranch from "../../hooks/useBranch";
import usePatient from "../../hooks/usePatient";
import useRoleAccess from "../../hooks/useRoleAccess";
import Modal from "./Modal";
import { exportPatientsToCSV } from "../../utils/csvExporter";
import { useToast } from "../../hooks/useToast";

const PatientSearch = () => {
  const { selectedBranch } = useBranch();
  const { isRole } = useRoleAccess();
  const {
    patients: allPatients,
    setSelectedPatient: setContextSelectedPatient,
  } = usePatient();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);
  const { success: showSuccess, error: showError } = useToast();

  const isReception = isRole("RECEPTION");

  useEffect(() => {
    // Cancel previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Cancel previous API request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setLoading(false);
      return;
    }

    // Increase debounce to 600ms to reduce API calls and avoid rate limiting
    searchTimeoutRef.current = setTimeout(() => {
      searchPatients(searchQuery.trim());
    }, 600); // Increased debounce to prevent rate limiting

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const searchPatients = async (query) => {
    try {
      setLoading(true);

      // Save search to history
      if (query.trim().length >= 2) {
        const searchHistory = JSON.parse(
          localStorage.getItem("patientSearchHistory") || "[]"
        );
        if (!searchHistory.includes(query.trim())) {
          searchHistory.unshift(query.trim());
          // Keep only last 10 searches
          const trimmed = searchHistory.slice(0, 10);
          localStorage.setItem("patientSearchHistory", JSON.stringify(trimmed));
        }
      }

      // First try to search in local context patients
      const queryLower = query.toLowerCase();
      const localResults = allPatients.filter(
        (p) =>
          p.name?.toLowerCase().includes(queryLower) ||
          p.phone?.includes(query) ||
          p.cardNo?.toLowerCase().includes(queryLower) ||
          p.email?.toLowerCase().includes(queryLower)
      );

      // Show local results immediately if found, but still search API for completeness
      // This provides instant feedback while getting full results
      if (localResults.length > 0) {
        setSearchResults(localResults.slice(0, 10));
        // Don't return - continue to API search for more complete results
      }

      // Determine search type: phone, cardNo, or name
      // Phone: only digits, spaces, dashes, parentheses, plus signs
      const isPhone =
        /^[\d\s\-+()]+$/.test(query.trim()) && /[\d]/.test(query.trim());

      // CardNo: alphanumeric but more specific - typically shorter and has specific format
      // Only treat as cardNo if it's short (max 20 chars) and looks like an ID/card number
      // Not just any alphanumeric string (that would match names too)
      const trimmedQuery = query.trim();
      const isCardNo =
        /^[A-Z0-9]{3,20}$/i.test(trimmedQuery) &&
        !/^[a-z]+$/i.test(trimmedQuery) && // Not just letters (that's a name)
        (/[0-9]/.test(trimmedQuery) || trimmedQuery.length <= 8); // Has numbers or is short ID

      // Build search params - default to name search for most queries
      const searchParams = { limit: 10 };
      if (isPhone) {
        searchParams.phone = trimmedQuery;
      } else if (isCardNo) {
        searchParams.cardNo = trimmedQuery;
      } else {
        // Default to name search (most common case)
        searchParams.name = trimmedQuery;
      }

      // Note: We don't send branchId to search endpoint
      // Patient search should find ALL patients regardless of branch
      // This allows finding patients even if they don't have appointments yet

      // If no local results, search via API
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new AbortController for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const response = await api.get("/patients/search", {
        params: searchParams,
        signal: abortController.signal,
      });

      // The API interceptor already extracts data from { success: true, data: [...] }
      // So response.data should be the array directly
      const patients = Array.isArray(response.data) ? response.data : [];

      setSearchResults(patients);
    } catch (err) {
      // Ignore abort errors (expected when user types quickly)
      if (
        err.name === "CanceledError" ||
        err.code === "ERR_CANCELED" ||
        err.message === "canceled"
      ) {
        console.log("Search request canceled (user typing)");
        return;
      }

      // Handle rate limiting specifically
      if (err.response?.status === 429) {
        const retryAfter = err.response?.data?.retryAfter || 10;
        showError(
          `Too many search requests. Please wait ${retryAfter} seconds and try again.`
        );
        console.error(
          "Rate limit exceeded. Please type slower or wait a moment."
        );
      } else {
        console.error("Error searching patients:", err);
        const errorMessage =
          err.response?.data?.message ||
          err.message ||
          "Failed to search patients";
        showError(errorMessage);
      }
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = async (patient) => {
    setSelectedPatient(patient);
    // Update context selected patient
    setContextSelectedPatient(patient);
    setHistoryModalOpen(true);
    await fetchPatientHistory(patient.id);
  };

  // Listen for appointment creation events to auto-refresh patient history
  useEffect(() => {
    if (!historyModalOpen || !selectedPatient?.id) return;

    const handleAppointmentCreated = () => {
      // Auto-refresh patient history when appointment is created
      fetchPatientHistory(selectedPatient.id);
    };

    window.addEventListener("appointment-created", handleAppointmentCreated);
    return () => {
      window.removeEventListener(
        "appointment-created",
        handleAppointmentCreated
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyModalOpen, selectedPatient?.id]);

  const fetchPatientHistory = async (patientId) => {
    try {
      setLoading(true);
      const response = await api.get(`/history/patient/${patientId}`, {
        params: { branchId: selectedBranch?.id },
      });
      const history = response.data?.data || response.data || {};
      setPatientHistory(history);
    } catch (err) {
      console.error("Error fetching patient history:", err);
      setPatientHistory(null);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-ET", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
      <h2 className="text-lg md:text-xl font-bold mb-4">
        Quick Patient Search
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Search by patient name to view full history immediately
      </p>

      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Type patient name to search..."
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
          </div>
        )}
      </div>

      {searchResults.length > 0 && (
        <>
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Found {searchResults.length} patient(s)
            </p>
            <button
              onClick={() => {
                try {
                  exportPatientsToCSV(searchResults);
                  showSuccess("Patient data exported successfully");
                } catch (err) {
                  showError("Failed to export patient data");
                  console.error("Export error:", err);
                }
              }}
              className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
            >
              📥 Export to CSV
            </button>
          </div>
          <div className="mt-2 border border-gray-200 rounded-md max-h-60 overflow-y-auto">
            {searchResults.map((patient) => (
              <div
                key={patient.id}
                onClick={() => handlePatientSelect(patient)}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
              >
                <div className="font-medium text-gray-900">{patient.name}</div>
                {patient.phone && (
                  <div className="text-sm text-gray-500">{patient.phone}</div>
                )}
                {patient.email && (
                  <div className="text-sm text-gray-500">{patient.email}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {searchQuery.length >= 2 && searchResults.length === 0 && !loading && (
        <div className="mt-4 text-center text-gray-500 text-sm">
          No patients found
        </div>
      )}

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
        {loading ? (
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
                      {!isReception && appointment.xrayResult && (
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
                      {treatment.primaryDiagnosis && (
                        <div className="text-sm text-gray-600 mb-1">
                          Diagnosis: {treatment.primaryDiagnosis}
                        </div>
                      )}
                      {treatment.procedures &&
                        treatment.procedures.length > 0 && (
                          <div className="text-sm text-gray-600">
                            Procedures: {treatment.procedures.length}{" "}
                            procedure(s)
                          </div>
                        )}
                      {treatment.status && (
                        <div className="mt-2">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              treatment.status === "COMPLETED"
                                ? "bg-green-100 text-green-800"
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

            {/* X-Ray Results - Hidden for Reception role */}
            {!isReception && (
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
            )}
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

export default memo(PatientSearch);
