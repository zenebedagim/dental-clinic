import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import DataTable from "../../common/DataTable";
import { formatDate } from "../../../utils/tableUtils";

const ReceptionAppointmentListView = () => {
  const { selectedBranch } = useBranch();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Initialize filters from URL params
  const getInitialStatusFilter = () => {
    const statusParam = searchParams.get("status");
    return statusParam || "ALL";
  };
  
  const getInitialDateFilter = () => {
    const dateParam = searchParams.get("date");
    return dateParam || "";
  };
  
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20); // Fixed page size for better performance
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState(getInitialStatusFilter());
  const [dateFilter, setDateFilter] = useState(getInitialDateFilter());

  // Debounce function for slow networks
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
    if (!selectedBranch?.id) {
      console.warn("ReceptionAppointmentListView: No selectedBranch.id, cannot fetch appointments");
      setLoading(false);
      setError("Please select a branch to view appointments");
      return;
    }

    // Use AbortController for request cancellation
    const abortController = new AbortController();

    try {
      setLoading(true);
      setError("");

      // Build query params - minimal data for slow networks
      const params = {
        branchId: selectedBranch.id,
        limit: pageSize,
        skip: (page - 1) * pageSize,
      };

      // Add status filter if not ALL
      if (statusFilter && statusFilter !== "ALL") {
        params.status = statusFilter;
      }

      // Add date filter if provided
      if (dateFilter) {
        const filterDate = new Date(dateFilter);
        filterDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(filterDate);
        nextDay.setDate(nextDay.getDate() + 1);
        params.startDate = filterDate.toISOString();
        params.endDate = nextDay.toISOString();
      }

      const response = await api.get("/appointments/reception", { 
        params,
        signal: abortController.signal,
      });
      const data = response.data?.data || response.data || [];
      
      console.log("Received appointments:", data.length, "appointments");
      
      // If we got less than pageSize, we've reached the end
      if (data.length < pageSize) {
        setTotalCount((page - 1) * pageSize + data.length);
      } else {
        // Estimate total (for slow networks, we don't want to fetch count separately)
        setTotalCount(page * pageSize + 1); // +1 to show "more available"
      }

      setAppointments(data);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setError(
        err.response?.data?.message || "Failed to load appointments. Please try again."
      );
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, page, pageSize, statusFilter, dateFilter]);

  // Update filters from URL params when they change
  useEffect(() => {
    const statusParam = searchParams.get("status");
    const dateParam = searchParams.get("date");
    
    if (statusParam && statusParam !== statusFilter) {
      setStatusFilter(statusParam);
    }
    if (dateParam !== null && dateParam !== dateFilter) {
      setDateFilter(dateParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Initial fetch and when dependencies change
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Refresh when navigating to this page (e.g., after creating appointment)
  useEffect(() => {
    if (selectedBranch?.id) {
      // Always fetch when location changes (user navigates to this page)
      fetchAppointments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, selectedBranch?.id]);

  // Listen for appointment creation events to refresh the list
  useEffect(() => {
    const handleAppointmentCreated = () => {
      if (selectedBranch?.id) {
        // Always refresh when appointment is created
        // Reset to page 1 to show the new appointment (most recent first)
        setPage(1);
        // Force immediate refresh
        fetchAppointments();
      }
    };

    window.addEventListener("appointment-created", handleAppointmentCreated);
    return () => {
      window.removeEventListener("appointment-created", handleAppointmentCreated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch]);

  // Debounced date filter change
  const debouncedDateFilter = useMemo(
    () =>
      debounce((value) => {
        setDateFilter(value);
        setPage(1); // Reset to first page when filter changes
        // Update URL params
        const newSearchParams = new URLSearchParams(searchParams);
        if (value) {
          newSearchParams.set("date", value);
        } else {
          newSearchParams.delete("date");
        }
        setSearchParams(newSearchParams);
      }, 500),
    [debounce, searchParams, setSearchParams]
  );

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
        render: (value, row) => row.patient?.phone || "—",
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
    ],
    []
  );

  if (!selectedBranch) {
    return (
      <div className="p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
        Please select a branch to view appointments.
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Appointment List
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            All your appointments - {totalCount > 0 ? `${totalCount}+` : "Loading..."} total
          </p>
        </div>
      </div>

      {/* Filters - Optimized for slow networks */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Date (Optional)
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => {
                debouncedDateFilter(e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm min-h-[44px]"
            />
          </div>

          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setStatusFilter("ALL");
                setDateFilter("");
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
              Showing {appointments.length} appointment{appointments.length !== 1 ? "s" : ""}
              {totalCount > appointments.length && ` (${totalCount}+ total)`}
            </div>
            <div className="flex items-center gap-2">
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
    </div>
  );
};

export default ReceptionAppointmentListView;

