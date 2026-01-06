import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import api from "../../../services/api";
import DataTable from "../../common/DataTable";
import { formatDate } from "../../../utils/tableUtils";
import requestCache from "../../../utils/requestCache";
import { exportAppointmentsToCSV } from "../../../utils/csvExporter";
import { useToast } from "../../../hooks/useToast";
import AppointmentRescheduleModal from "./AppointmentRescheduleModal";
import ConfirmDialog from "../../common/ConfirmDialog";

const ReceptionAppointmentListView = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { success: showSuccess, error: showError } = useToast();

  // Initialize filters from URL params
  const getInitialStatusFilter = () => {
    const statusParam = searchParams.get("status");
    return statusParam || "ALL";
  };

  const getInitialDateFilter = () => {
    const dateParam = searchParams.get("date");
    // Only return date if explicitly provided in URL (don't default to today)
    return dateParam || "";
  };

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20); // Configurable page size
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState(getInitialStatusFilter());
  const [dateFilter, setDateFilter] = useState(getInitialDateFilter());
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dentistFilter, setDentistFilter] = useState("");
  const [patientNameSearch, setPatientNameSearch] = useState("");
  const [dentists, setDentists] = useState([]);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedAppointmentForAction, setSelectedAppointmentForAction] =
    useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const abortControllerRef = useRef(null);

  // Debounce function for slow networks (increased delay to 500ms)
  const debounce = useCallback((func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }, []);

  // Fetch appointments with pagination and filters
  const fetchAppointments = useCallback(async () => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Use AbortController for request cancellation
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      setLoading(true);
      setError("");

      // Build query params - minimal data for slow networks
      // Note: branchId is not needed - backend uses req.user.branchId automatically
      const params = {
        limit: pageSize,
        skip: (page - 1) * pageSize,
      };

      // Add status filter if not ALL
      if (statusFilter && statusFilter !== "ALL") {
        params.status = statusFilter;
      }

      // Add date range filter (prefer startDate/endDate over single dateFilter)
      if (startDate && endDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        params.startDate = start.toISOString();
        params.endDate = end.toISOString();
      } else if (dateFilter) {
        // Fallback to single date filter for backward compatibility
        const filterDate = new Date(dateFilter);
        filterDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(filterDate);
        nextDay.setDate(nextDay.getDate() + 1);
        params.startDate = filterDate.toISOString();
        params.endDate = nextDay.toISOString();
      }

      // Add dentist filter if provided
      if (dentistFilter) {
        params.dentistId = dentistFilter;
      }

      // Add patient name search if provided
      if (patientNameSearch) {
        params.patientName = patientNameSearch;
      }

      // Add sorting parameters from URL if provided
      const sortByParam = searchParams.get("sortBy");
      const orderByParam = searchParams.get("orderBy");
      if (sortByParam) {
        params.sortBy = sortByParam;
      }
      if (orderByParam) {
        params.orderBy = orderByParam;
      }

      const response = await api.get("/appointments/reception", {
        params,
        signal: abortController.signal,
      });
      const data = response.data?.data || response.data || [];
      const meta = response.data?.meta || {};

      console.log("Received appointments:", data.length, "appointments");

      // Use server-provided pagination metadata if available
      if (meta.total !== undefined) {
        setTotalCount(meta.total);
      } else {
        // Fallback: estimate total if we got less than pageSize
        if (data.length < pageSize) {
          setTotalCount((page - 1) * pageSize + data.length);
        } else {
          // Estimate total (for slow networks, we don't want to fetch count separately)
          setTotalCount(page * pageSize + 1); // +1 to show "more available"
        }
      }

      setAppointments(data);
    } catch (err) {
      // Ignore abort/cancel errors - these are expected when component unmounts
      if (
        err.name === "CanceledError" ||
        err.code === "ERR_CANCELED" ||
        err.message === "canceled"
      ) {
        return; // Don't log or set error for canceled requests
      }
      console.error("Error fetching appointments:", err);
      setError(
        err.response?.data?.message ||
          "Failed to load appointments. Please try again."
      );
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    pageSize,
    statusFilter,
    dateFilter,
    startDate,
    endDate,
    dentistFilter,
    patientNameSearch,
    searchParams,
  ]);

  // Fetch dentists for filter dropdown
  useEffect(() => {
    const fetchDentists = async () => {
      try {
        const response = await api.get("/users", {
          params: { role: "DENTIST" },
        });
        const dentistsData = response.data?.data || response.data || [];
        setDentists(dentistsData);
      } catch (err) {
        console.error("Error fetching dentists:", err);
      }
    };
    fetchDentists();
  }, []);

  // Debounced patient name search
  const debouncedPatientNameSearch = useMemo(
    () =>
      debounce((value) => {
        setPatientNameSearch(value);
        setPage(1); // Reset to first page when search changes
      }, 300),
    [debounce]
  );

  // Update filters from URL params when they change
  useEffect(() => {
    const statusParam = searchParams.get("status");
    const dateParam = searchParams.get("date");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const dentistParam = searchParams.get("dentistId");
    const patientNameParam = searchParams.get("patientName");

    if (statusParam && statusParam !== statusFilter) {
      setStatusFilter(statusParam);
    }
    if (dateParam !== null && dateParam !== dateFilter) {
      setDateFilter(dateParam);
    }
    if (startDateParam !== null && startDateParam !== startDate) {
      setStartDate(startDateParam);
    }
    if (endDateParam !== null && endDateParam !== endDate) {
      setEndDate(endDateParam);
    }
    if (dentistParam !== null && dentistParam !== dentistFilter) {
      setDentistFilter(dentistParam);
    }
    if (patientNameParam !== null && patientNameParam !== patientNameSearch) {
      setPatientNameSearch(patientNameParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Initial fetch and when dependencies change
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Refresh when navigating to this page (e.g., after creating appointment)
  useEffect(() => {
    // Always fetch when location changes (user navigates to this page)
    fetchAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Listen for appointment creation events to refresh the list
  useEffect(() => {
    const handleAppointmentCreated = () => {
      // Invalidate cache
      requestCache.delete((key) => key.startsWith("/appointments/reception"));
      // Always refresh when appointment is created
      // Reset to page 1 to show the new appointment (most recent first)
      setPage(1);
      // Force immediate refresh
      fetchAppointments();
    };

    window.addEventListener("appointment-created", handleAppointmentCreated);
    return () => {
      window.removeEventListener(
        "appointment-created",
        handleAppointmentCreated
      );
    };
  }, [fetchAppointments]);

  // Table columns - minimal data for performance
  const columns = useMemo(
    () => [
      {
        key: "date",
        label: "Date & Time",
        sortable: true,
        render: (value) => {
          if (!value) return "—";
          try {
            return formatDate(value);
          } catch {
            return "Invalid Date";
          }
        },
      },
      {
        key: "patientName",
        label: "Patient",
        sortable: true,
        searchable: true,
        render: (value) => value || "—",
      },
      {
        key: "patient.phone",
        label: "Phone",
        sortable: false,
        render: (value, row) => {
          // Check all possible locations for phone number
          const phone =
            row?.patient?.phone ||
            row?.patientPhone ||
            row?.phone ||
            value ||
            null;

          // Always return the phone if it exists, otherwise show "—"
          return phone || "—";
        },
      },
      {
        key: "dentist.name",
        label: "Dentist",
        sortable: true,
        render: (value, row) => row.dentist?.name || "N/A",
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (value) => {
          const statusColors = {
            PENDING: "bg-yellow-100 text-yellow-800",
            IN_PROGRESS: "bg-blue-100 text-blue-800",
            COMPLETED: "bg-green-100 text-green-800",
            CANCELLED: "bg-red-100 text-red-800",
          };
          const colorClass = statusColors[value] || "bg-gray-100 text-gray-800";
          return (
            <span
              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}`}
            >
              {value || "PENDING"}
            </span>
          );
        },
      },
      {
        key: "visitReason",
        label: "Reason",
        sortable: false,
        render: (value) => {
          if (!value) return "—";
          return value.length > 50 ? `${value.substring(0, 50)}...` : value;
        },
      },
      {
        key: "actions",
        label: "Actions",
        sortable: false,
        render: (value, row) => (
          <div className="flex gap-2">
            {row.status === "PENDING" && (
              <>
                <button
                  onClick={() => handleReschedule(row)}
                  disabled={actionLoading}
                  className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50"
                  title="Reschedule"
                >
                  ↻ Reschedule
                </button>
                <button
                  onClick={() => handleCancel(row)}
                  disabled={actionLoading}
                  className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
                  title="Cancel"
                >
                  ✕ Cancel
                </button>
              </>
            )}
            {row.status === "IN_PROGRESS" && (
              <span className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded">
                In Progress
              </span>
            )}
            {(row.status === "COMPLETED" || row.status === "CANCELLED") && (
              <span className="px-2 py-1 text-xs text-gray-500 bg-gray-50 rounded">
                {row.status}
              </span>
            )}
          </div>
        ),
      },
    ],
    [actionLoading]
  );

  const handleReschedule = (appointment) => {
    setSelectedAppointmentForAction(appointment);
    setRescheduleModalOpen(true);
  };

  const handleCancel = (appointment) => {
    setSelectedAppointmentForAction(appointment);
    setCancelDialogOpen(true);
  };

  const confirmCancel = async () => {
    if (!selectedAppointmentForAction?.id) return;

    try {
      setActionLoading(true);
      await api.post(`/appointments/${selectedAppointmentForAction.id}/cancel`);
      showSuccess("Appointment cancelled successfully");
      window.dispatchEvent(new CustomEvent("appointment-created"));
      setCancelDialogOpen(false);
      setSelectedAppointmentForAction(null);
      fetchAppointments();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to cancel appointment");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Appointment List
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            All your appointments -{" "}
            {totalCount > 0 ? `${totalCount}+` : "Loading..."} total
          </p>
        </div>
      </div>

      {/* Filters - Optimized for slow networks */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1); // Reset to first page
                // Update URL params
                const newSearchParams = new URLSearchParams(searchParams);
                if (e.target.value === "ALL") {
                  newSearchParams.delete("status");
                } else {
                  newSearchParams.set("status", e.target.value);
                }
                setSearchParams(newSearchParams);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-h-[44px]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Date Range - Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
                const newSearchParams = new URLSearchParams(searchParams);
                if (e.target.value) {
                  newSearchParams.set("startDate", e.target.value);
                } else {
                  newSearchParams.delete("startDate");
                }
                setSearchParams(newSearchParams);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-h-[44px]"
            />
          </div>

          {/* Date Range - End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
                const newSearchParams = new URLSearchParams(searchParams);
                if (e.target.value) {
                  newSearchParams.set("endDate", e.target.value);
                } else {
                  newSearchParams.delete("endDate");
                }
                setSearchParams(newSearchParams);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-h-[44px]"
            />
          </div>

          {/* Dentist Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Dentist
            </label>
            <select
              value={dentistFilter}
              onChange={(e) => {
                setDentistFilter(e.target.value);
                setPage(1);
                const newSearchParams = new URLSearchParams(searchParams);
                if (e.target.value) {
                  newSearchParams.set("dentistId", e.target.value);
                } else {
                  newSearchParams.delete("dentistId");
                }
                setSearchParams(newSearchParams);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-h-[44px]"
            >
              <option value="">All Dentists</option>
              {dentists.map((dentist) => (
                <option key={dentist.id} value={dentist.id}>
                  {dentist.name}
                </option>
              ))}
            </select>
          </div>

          {/* Patient Name Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Patient Name
            </label>
            <input
              type="text"
              value={patientNameSearch}
              onChange={(e) => {
                const value = e.target.value;
                debouncedPatientNameSearch(value);
                const newSearchParams = new URLSearchParams(searchParams);
                if (value) {
                  newSearchParams.set("patientName", value);
                } else {
                  newSearchParams.delete("patientName");
                }
                setSearchParams(newSearchParams);
              }}
              placeholder="Search by name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-h-[44px]"
            />
          </div>

          {/* Page Size Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Page Size
            </label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value));
                setPage(1); // Reset to first page when changing page size
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-h-[44px]"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
              <option value={100}>100 per page</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setDateFilter("");
                setStartDate("");
                setEndDate("");
                setDentistFilter("");
                setPatientNameSearch("");
                setPage(1);
                // Clear URL params
                setSearchParams({});
              }}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
          <button
            onClick={fetchAppointments}
            className="ml-4 text-sm font-medium underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && appointments.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-gray-500">Loading appointments...</p>
          <p className="mt-1 text-xs text-gray-400">
            Please wait, this may take a moment on slow networks
          </p>
        </div>
      ) : (
        <>
          {/* DataTable - disable internal pagination since we use server-side */}
          <DataTable
            data={appointments}
            columns={columns}
            title="Appointments"
            emptyMessage="No appointments found"
            pageSize={appointments.length} // Show all loaded items
            searchable={true}
            sortable={true}
            pagination={false} // Disable internal pagination
            exportable={false} // Disable export for slow networks
            printable={false} // Disable print for slow networks
          />

          {/* Custom Pagination Controls - Optimized for slow networks */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-md">
            <div className="text-sm text-gray-600">
              Showing {appointments.length} appointment
              {appointments.length !== 1 ? "s" : ""}
              {totalCount > appointments.length && ` (${totalCount}+ total)`}
            </div>
            <div className="flex items-center gap-2">
              {appointments.length > 0 && (
                <button
                  onClick={() => {
                    try {
                      exportAppointmentsToCSV(appointments);
                      showSuccess("Appointments exported successfully");
                    } catch (err) {
                      showError("Failed to export appointments");
                      console.error("Export error:", err);
                    }
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition-colors"
                  title="Export to CSV"
                >
                  📥 Export
                </button>
              )}
              <button
                onClick={() => {
                  if (page > 1) {
                    setPage(page - 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                disabled={page === 1 || loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-gray-700 min-h-[44px] flex items-center">
                Page {page}
              </span>
              <button
                onClick={() => {
                  if (appointments.length === pageSize) {
                    setPage(page + 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                disabled={appointments.length < pageSize || loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                Next
              </button>
            </div>
          </div>

          {/* Network Status Indicator */}
          {loading && appointments.length > 0 && (
            <div className="text-center py-2">
              <div className="inline-flex items-center text-sm text-gray-500">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 mr-2"></div>
                Loading more...
              </div>
            </div>
          )}
        </>
      )}

      {/* Reschedule Modal */}
      <AppointmentRescheduleModal
        isOpen={rescheduleModalOpen}
        onClose={() => {
          setRescheduleModalOpen(false);
          setSelectedAppointmentForAction(null);
        }}
        appointment={selectedAppointmentForAction}
        onSuccess={() => {
          fetchAppointments();
        }}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={cancelDialogOpen}
        onClose={() => {
          setCancelDialogOpen(false);
          setSelectedAppointmentForAction(null);
        }}
        onConfirm={confirmCancel}
        title="Cancel Appointment"
        message={`Are you sure you want to cancel the appointment for ${
          selectedAppointmentForAction?.patientName || "this patient"
        }?`}
        confirmText="Cancel Appointment"
        cancelText="Keep Appointment"
        confirmButtonClass="bg-red-600 hover:bg-red-700"
        loading={actionLoading}
      />
    </div>
  );
};

export default ReceptionAppointmentListView;
