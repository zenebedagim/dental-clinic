import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import { formatDate } from "../../../utils/tableUtils";

const PatientList = ({
  filterType = null, // 'pending', 'inProgress', 'completed', or null
  onViewHistory = () => {},
  initialSearchMode = false,
  autoSearchPatientId = null,
  autoSearchPatientName = null,
}) => {
  const { selectedBranch } = useBranch();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState(initialSearchMode);
  const [searchQuery, setSearchQuery] = useState("");
  const searchTimeoutRef = useRef(null);
  const autoSearchProcessedRef = useRef(false);

  // Fetch appointments based on mode
  const fetchAppointments = useCallback(async () => {
    if (!selectedBranch?.id) return;

    setLoading(true);
    try {
      const params = {
        branchId: selectedBranch.id,
        limit: 500, // Get enough appointments for search mode
      };

      const response = await api.get("/appointments/dentist", { params });
      const appointmentsData = response.data?.data || response.data || [];

      if (searchMode) {
        // Search All Patients mode: Show all appointments with treatments (any status)
        const appointmentsWithTreatments = appointmentsData.filter((apt) => {
          const hasTreatment =
            (apt.treatments && apt.treatments.length > 0) || apt.treatment;
          return hasTreatment;
        });

        // Sort by most recent date (appointment date or treatment date) - newest first
        const sortedAppointments = appointmentsWithTreatments.sort((a, b) => {
          const getDate = (apt) => {
            if (apt.treatments && apt.treatments.length > 0) {
              const latestTreatment = apt.treatments[0];
              return new Date(
                latestTreatment.updatedAt ||
                  latestTreatment.createdAt ||
                  apt.date
              );
            }
            if (apt.treatment) {
              return new Date(
                apt.treatment.updatedAt || apt.treatment.createdAt || apt.date
              );
            }
            return new Date(apt.date);
          };

          const dateA = getDate(a);
          const dateB = getDate(b);
          return dateB - dateA; // Descending order (newest first)
        });

        setAppointments(sortedAppointments);
      } else {
        // Default mode: Show only new appointments (status PENDING, no treatment started)
        const newAppointments = appointmentsData.filter((apt) => {
          // No treatment started yet
          const hasNoTreatment =
            (!apt.treatments || apt.treatments.length === 0) && !apt.treatment;
          return hasNoTreatment && apt.status === "PENDING";
        });

        // Sort by appointment date - newest first
        const sortedAppointments = newAppointments.sort((a, b) => {
          return new Date(b.date) - new Date(a.date);
        });

        setAppointments(sortedAppointments);
      }
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, searchMode]);

  // Apply filters and search
  useEffect(() => {
    let filtered = [...appointments];

    // Apply filterType if provided
    if (filterType) {
      filtered = filtered.filter((apt) => {
        // Get treatment from treatments array or treatment object
        const treatment =
          apt.treatments && apt.treatments.length > 0
            ? apt.treatments[0]
            : apt.treatment;

        const treatmentStatus = treatment?.status || "";

        switch (filterType) {
          case "pending":
            // Show appointments with PENDING treatments or no treatment
            return !treatment || treatmentStatus === "PENDING";
          case "inProgress":
            return treatmentStatus === "IN_PROGRESS";
          case "completed":
            return treatmentStatus === "COMPLETED";
          default:
            return true;
        }
      });
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((apt) => {
        const patientName = apt.patientName || apt.patient?.name || "";
        return patientName.toLowerCase().includes(query);
      });
    }

    setFilteredAppointments(filtered);
  }, [appointments, filterType, searchQuery]);

  // Auto-search for patient if provided
  useEffect(() => {
    if (
      autoSearchPatientId &&
      autoSearchPatientName &&
      !autoSearchProcessedRef.current &&
      filteredAppointments.length > 0
    ) {
      autoSearchProcessedRef.current = true;
      setSearchQuery(autoSearchPatientName);
    }
  }, [autoSearchPatientId, autoSearchPatientName, filteredAppointments]);

  // Fetch appointments when mode or branch changes
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Handle search input with debounce
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Only search if in search mode or if query is long enough
    if (searchMode || value.length >= 2) {
      // Search is handled by the useEffect above
    }
  };

  // Handle appointment click - behavior depends on mode
  const handleAppointmentClick = (appointment) => {
    if (searchMode) {
      // In "Search All Patients" mode: show history (don't navigate to treatment)
      // Check if appointment has valid patientId
      const hasValidPatientId =
        appointment?.patientId ||
        appointment?.patient?.id ||
        appointment?.treatment?.patientId ||
        appointment?.treatments?.[0]?.patientId;

      if (hasValidPatientId) {
        onViewHistory(appointment);
      }
    } else {
      // In "New Appointments" mode: navigate to treatment page
      // Pass the full appointment object so treatment page has all patient information
      navigate("/dentist/treatment", {
        state: {
          appointment: appointment, // Pass full appointment object
        },
      });
    }
  };

  // Check if appointment can show history (has valid patientId)
  const canViewHistory = (appointment) => {
    return !!(
      appointment?.patientId ||
      appointment?.patient?.id ||
      appointment?.treatment?.patientId ||
      appointment?.treatments?.[0]?.patientId
    );
  };

  // Get treatment status badge
  const getStatusBadge = (appointment) => {
    const treatment =
      appointment.treatments && appointment.treatments.length > 0
        ? appointment.treatments[0]
        : appointment.treatment;

    const status = treatment?.status || appointment.status || "PENDING";

    const statusMap = {
      COMPLETED: "bg-green-100 text-green-800",
      IN_PROGRESS: "bg-blue-100 text-blue-800",
      PENDING: "bg-yellow-100 text-yellow-800",
    };

    return (
      <span
        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          statusMap[status] || "bg-gray-100 text-gray-800"
        }`}
      >
        {status}
      </span>
    );
  };

  // Get treatment number/sequence
  const getTreatmentNumber = (appointment) => {
    const treatment =
      appointment.treatments && appointment.treatments.length > 0
        ? appointment.treatments[0]
        : appointment.treatment;

    if (treatment?.treatmentNumber) {
      return treatment.treatmentNumber;
    }
    if (treatment?.treatmentSequence) {
      return treatment.treatmentSequence;
    }
    if (appointment.treatments && appointment.treatments.length > 0) {
      return appointment.treatments.length;
    }
    return null;
  };

  // Get diagnosis
  const getDiagnosis = (appointment) => {
    const treatment =
      appointment.treatments && appointment.treatments.length > 0
        ? appointment.treatments[0]
        : appointment.treatment;

    return (
      treatment?.diagnosisCode ||
      treatment?.diagnosis ||
      treatment?.primaryDiagnosis?.name ||
      "—"
    );
  };

  if (!selectedBranch) {
    return (
      <div className="px-4 py-3 text-yellow-700 bg-yellow-100 border border-yellow-400 rounded">
        Please select a branch to view patients.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mode Toggle and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => {
              // If in search mode, switch to new appointments view
              if (searchMode) {
                setSearchMode(false);
                setSearchQuery("");
                autoSearchProcessedRef.current = false;
              } else {
                // If already showing new appointments, navigate to treatment page with first appointment
                // Filter to get new appointments (PENDING status, no treatment)
                const newAppointments = appointments.filter((apt) => {
                  const hasNoTreatment =
                    (!apt.treatments || apt.treatments.length === 0) &&
                    !apt.treatment;
                  return hasNoTreatment && apt.status === "PENDING";
                });

                if (newAppointments.length > 0) {
                  // Navigate to treatment page with first new appointment (most recent)
                  navigate("/dentist/treatment", {
                    state: {
                      appointment: newAppointments[0],
                    },
                  });
                } else {
                  // No new appointments available, show message or just toggle view
                  setSearchMode(false);
                  setSearchQuery("");
                  autoSearchProcessedRef.current = false;
                }
              }
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              !searchMode
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            New Appointments
          </button>
          <button
            onClick={() => {
              setSearchMode(true);
              setSearchQuery("");
              autoSearchProcessedRef.current = false;
            }}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              searchMode
                ? "bg-indigo-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Search All Patients
          </button>
        </div>

        {searchMode && (
          <div className="w-full sm:w-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by patient name..."
              className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-12 text-center">
          <div className="inline-block w-8 h-8 border-b-2 border-indigo-600 rounded-full animate-spin"></div>
          <p className="mt-2 text-gray-500">Loading patients...</p>
        </div>
      )}

      {/* Appointments List */}
      {!loading && (
        <>
          {filteredAppointments.length === 0 ? (
            <div className="p-6 bg-white rounded-lg shadow-md">
              <p className="py-8 text-center text-gray-500">
                {searchQuery
                  ? "No patients found matching your search"
                  : searchMode
                  ? "No patients with treatments found"
                  : "No new appointments available"}
              </p>
            </div>
          ) : (
            <div className="overflow-hidden bg-white rounded-lg shadow-md">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {searchMode && (
                        <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          Treatment #
                        </th>
                      )}
                      <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Patient Name
                      </th>
                      <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Date
                      </th>
                      {searchMode && (
                        <>
                          <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Diagnosis
                          </th>
                          <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Status
                          </th>
                        </>
                      )}
                      <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAppointments.map((appointment) => {
                      const treatmentNumber = getTreatmentNumber(appointment);
                      const diagnosis = getDiagnosis(appointment);

                      return (
                        <tr
                          key={appointment.id}
                          onClick={() => handleAppointmentClick(appointment)}
                          className="cursor-pointer transition-colors hover:bg-gray-50"
                        >
                          {searchMode && (
                            <td className="px-4 py-4 whitespace-nowrap">
                              {treatmentNumber ? (
                                <span className="text-sm font-semibold text-indigo-600">
                                  #{treatmentNumber}
                                </span>
                              ) : (
                                <span className="text-sm text-gray-400">—</span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {appointment.patientName ||
                                appointment.patient?.name ||
                                "N/A"}
                            </div>
                            {appointment.patient?.phone && (
                              <div className="text-xs text-gray-500">
                                {appointment.patient.phone}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(
                                appointment.date || appointment.createdAt,
                                "short"
                              )}
                            </div>
                          </td>
                          {searchMode && (
                            <>
                              <td className="px-4 py-4">
                                <div className="text-sm text-gray-900">
                                  {diagnosis}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                {getStatusBadge(appointment)}
                              </td>
                            </>
                          )}
                          <td className="px-4 py-4 whitespace-nowrap">
                            {canViewHistory(appointment) ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // In search mode, show history; in new appointments mode, navigate to treatment
                                  if (searchMode) {
                                    onViewHistory(appointment);
                                  } else {
                                    navigate("/dentist/treatment", {
                                      state: {
                                        appointment: appointment,
                                      },
                                    });
                                  }
                                }}
                                className="px-3 py-1 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
                              >
                                {searchMode
                                  ? "View History"
                                  : "Start Treatment"}
                              </button>
                            ) : (
                              <div className="flex flex-col items-start">
                                <button
                                  disabled
                                  className="px-3 py-1 text-sm font-medium text-gray-400 bg-gray-100 rounded-md cursor-not-allowed"
                                  title="This appointment is not properly linked to a patient"
                                >
                                  Treatment
                                </button>
                                <span className="text-xs text-red-600 mt-1">
                                  ⚠️ Data issue
                                </span>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Results Count */}
          {filteredAppointments.length > 0 && (
            <div className="text-sm text-gray-600">
              Showing {filteredAppointments.length} of {appointments.length}{" "}
              {searchMode ? "patients" : "appointments"}
              {searchQuery && ` matching "${searchQuery}"`}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PatientList;
