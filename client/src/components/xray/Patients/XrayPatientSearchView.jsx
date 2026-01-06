import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import Modal from "../../common/Modal";

const XrayPatientSearchView = () => {
  const { selectedBranch } = useBranch();
  const [searchParams] = useSearchParams();
  const filter = searchParams.get("filter") || "all";
  
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientHistory, setPatientHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Sort appointments by closest time to now
  const sortByClosestTime = useCallback((appointmentsList) => {
    const now = new Date();
    return [...appointmentsList].sort((a, b) => {
      const timeA = Math.abs(new Date(a.date) - now);
      const timeB = Math.abs(new Date(b.date) - now);
      return timeA - timeB;
    });
  }, []);

  const fetchXrayRequests = useCallback(async () => {
    if (!selectedBranch?.id) return;
    try {
      setLoading(true);
      const params = {
        branchId: selectedBranch.id,
        filter: filter, // Pass filter to server
      };
      const response = await api.get("/xray", { params });
      const appointmentsData = response.data?.data || response.data || [];
      
      // Apply client-side filtering if needed (server may not support all filters)
      let filtered = appointmentsData;
      if (filter === "pending") {
        filtered = appointmentsData.filter(
          (apt) => !apt.xrayResult || !apt.xrayResult.id
        );
      } else if (filter === "completed") {
        filtered = appointmentsData.filter(
          (apt) => apt.xrayResult && apt.xrayResult.id
        );
      }
      // filter === "all" shows all appointments
      
      // Sort by closest time
      const sorted = sortByClosestTime(filtered);
      setAppointments(sorted);
      setFilteredAppointments(sorted);
    } catch (err) {
      console.error("Error fetching X-Ray requests:", err);
      setAppointments([]);
      setFilteredAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, filter, sortByClosestTime]);

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

  const handleAppointmentClick = async (appointment) => {
    // Get patient from appointment - handle both patient relation and patientId
    const patientId = appointment.patient?.id || appointment.patientId;
    const patient = appointment.patient || {
      id: patientId,
      name: appointment.patientName,
      phone: appointment.patient?.phone,
      email: appointment.patient?.email,
    };
    setSelectedPatient(patient);
    setHistoryModalOpen(true);
    if (patientId) {
      await fetchPatientHistory(patientId);
    }
  };

  // Fetch X-Ray requests on mount and when filter/branch changes
  useEffect(() => {
    if (selectedBranch?.id) {
      fetchXrayRequests();
    }
  }, [selectedBranch?.id, filter, fetchXrayRequests]);

  // Filter appointments based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredAppointments(appointments);
    } else {
      const queryLower = searchQuery.toLowerCase();
      const filtered = appointments.filter((apt) => {
        const patientName = apt.patientName || apt.patient?.name || "";
        const phone = apt.patient?.phone || "";
        const email = apt.patient?.email || "";
        return (
          patientName.toLowerCase().includes(queryLower) ||
          phone.includes(queryLower) ||
          email.toLowerCase().includes(queryLower)
        );
      });
      setFilteredAppointments(filtered);
    }
  }, [searchQuery, appointments]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          X-Ray Requests & Patient Search
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">
          {filter === "pending" && "View pending X-Ray requests"}
          {filter === "completed" && "View completed X-Ray requests"}
          {filter === "all" && "View all X-Ray requests"}
          {!filter && "View X-Ray requests and patient history"}
        </p>
      </div>

      {!selectedBranch ? (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Please select a branch to view X-Ray requests.
        </div>
      ) : (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient name, phone, or email..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-500">Loading X-Ray requests...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {searchQuery ? "No X-Ray requests found" : "No X-Ray requests available"}
            </p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredAppointments.map((appointment) => {
                const patient = appointment.patient || {
                  id: appointment.patientId,
                  name: appointment.patientName,
                  phone: appointment.patient?.phone,
                  email: appointment.patient?.email,
                };
                const hasResult = appointment.xrayResult && appointment.xrayResult.id;
                
                return (
                  <div
                    key={appointment.id}
                    onClick={() => handleAppointmentClick(appointment)}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      hasResult
                        ? "border-green-300 bg-green-50 hover:bg-green-100"
                        : "border-yellow-300 bg-yellow-50 hover:bg-yellow-100"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg text-gray-900">
                          {patient.name || appointment.patientName}
                        </h3>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Appointment:</span>{" "}
                            {formatDate(appointment.date)}
                          </p>
                          {appointment.dentist && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Dentist:</span>{" "}
                              {appointment.dentist.name}
                            </p>
                          )}
                          {patient.phone && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Phone:</span> {patient.phone}
                            </p>
                          )}
                          {patient.email && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Email:</span> {patient.email}
                            </p>
                          )}
                          {appointment.xrayResult?.xrayType && (
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">X-Ray Type:</span>{" "}
                              {appointment.xrayResult.xrayType}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="ml-4 flex flex-col items-end gap-2">
                        <span
                          className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                            hasResult
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {hasResult ? "Completed" : "Pending"}
                        </span>
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-indigo-100 text-indigo-800">
                          View History
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
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
              </div>
            </div>

            {/* X-Ray Results Only */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                X-Ray History
              </h3>
              {patientHistory.xrayResults &&
              patientHistory.xrayResults.length > 0 ? (
                <div className="space-y-4">
                  {patientHistory.xrayResults.map((xray) => (
                    <div
                      key={xray.id}
                      className="border border-gray-200 rounded-md p-4 bg-white"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="font-semibold text-lg text-gray-900 mb-1">
                            {xray.xrayType || "X-Ray"}
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            Date: {formatDate(xray.createdAt)}
                          </div>
                          {xray.appointment && (
                            <div className="text-sm text-gray-600 mb-2">
                              <span className="font-medium">Appointment:</span>{" "}
                              {formatDate(xray.appointment.date)}
                              {xray.appointment.dentist && (
                                <span className="ml-2">
                                  • Dentist: {xray.appointment.dentist.name}
                                </span>
                              )}
                            </div>
                          )}
                          {xray.result && (
                            <div className="text-sm text-gray-700 mt-3 p-3 bg-gray-50 rounded-md">
                              <span className="font-medium">Notes:</span>{" "}
                              {xray.result}
                            </div>
                          )}
                          {xray.sentToDentist && (
                            <div className="mt-2 text-sm text-green-600">
                              ✓ Sent to Dentist: {xray.sentToDentist.name}
                            </div>
                          )}
                        </div>
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 whitespace-nowrap ml-4">
                          Completed
                        </span>
                      </div>
                      {xray.images && xray.images.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="text-sm font-medium text-gray-700 mb-2">
                            Images ({xray.images.length}):
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {xray.images.map((image, idx) => (
                              <div key={idx} className="relative">
                                <img
                                  src={image.imageUrl}
                                  alt={`X-Ray ${idx + 1}`}
                                  className="w-full h-24 object-cover rounded border border-gray-300"
                                />
                                {image.imageType && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center rounded-b">
                                    {image.imageType}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-md">
                  <p className="text-gray-500 text-sm">
                    No X-Ray results found for this patient
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No history available for this patient
          </p>
        )}
      </Modal>
    </div>
  );
};

export default XrayPatientSearchView;
