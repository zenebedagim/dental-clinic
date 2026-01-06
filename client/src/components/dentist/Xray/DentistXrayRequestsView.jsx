import { useState, useEffect } from "react";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import { getSocket } from "../../../services/socketService";
import XrayRequestForm from "./XrayRequestForm";
import XrayRequests from "./XrayRequests";

const DentistXrayRequestsView = () => {
  const { selectedBranch } = useBranch();
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [xrayRequests, setXrayRequests] = useState([]);
  const [allXrayRequests, setAllXrayRequests] = useState([]); // Store all requests for filter counts
  const [filteredXrayRequests, setFilteredXrayRequests] = useState([]); // Filtered by search
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all"); // 'all', 'pending', 'completed'
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (selectedBranch?.id) {
      fetchXrayRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, filter]);

  // Listen for X-Ray result notifications and auto-refresh
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleXrayNotification = (notification) => {
      // Check if it's an X-Ray related notification
      if (
        notification.type === "XRAY_SENT" ||
        notification.type === "XRAY_READY"
      ) {
        // Small delay to ensure database is updated before refreshing
        setTimeout(() => {
          // Refresh the X-Ray requests list (this will also update selectedAppointment if needed)
          fetchXrayRequests();
        }, 1000); // Increased delay to 1 second to ensure database transaction completes
      }
    };

    socket.on("notification", handleXrayNotification);

    return () => {
      socket.off("notification", handleXrayNotification);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAppointment, selectedBranch]);

  // Filter xrayRequests based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredXrayRequests(xrayRequests);
    } else {
      const queryLower = searchQuery.toLowerCase();
      const filtered = xrayRequests.filter((apt) => {
        const dateStr = apt.date
          ? new Date(apt.date).toLocaleString().toLowerCase()
          : "";
        return (
          apt.patientName?.toLowerCase().includes(queryLower) ||
          apt.patient?.name?.toLowerCase().includes(queryLower) ||
          apt.patient?.phone?.includes(searchQuery) ||
          apt.patient?.email?.toLowerCase().includes(queryLower) ||
          apt.patient?.cardNo?.includes(searchQuery) ||
          dateStr.includes(queryLower)
        );
      });
      setFilteredXrayRequests(filtered);
    }
  }, [searchQuery, xrayRequests]);

  const fetchXrayRequests = async () => {
    if (!selectedBranch?.id) return;
    try {
      setLoading(true);
      setError(""); // Clear any previous errors
      // Use dentist appointments endpoint - it already includes xrayResult data
      const response = await api.get("/appointments/dentist", {
        params: { branchId: selectedBranch.id },
      });
      const appointments = response.data?.data || response.data || [];
      // Filter to show only appointments where X-ray was requested (xrayId is set)
      const allXrayAppointments = appointments.filter(
        (apt) => apt.xrayId !== null
      );
      setAllXrayRequests(allXrayAppointments);

      // Update selected appointment if it's in the refreshed data
      if (selectedAppointment) {
        const updatedSelected = allXrayAppointments.find(
          (apt) => apt.id === selectedAppointment.id
        );
        if (updatedSelected) {
          setSelectedAppointment(updatedSelected);
        }
      }

      // Apply additional filter based on status
      let filteredAppointments = allXrayAppointments;
      if (filter === "pending") {
        filteredAppointments = allXrayAppointments.filter(
          (apt) => !apt.xrayResult || !apt.xrayResult.sentToDentist
        );
      } else if (filter === "completed") {
        filteredAppointments = allXrayAppointments.filter(
          (apt) => apt.xrayResult && apt.xrayResult.sentToDentist
        );
      }

      setXrayRequests(filteredAppointments);
      setFilteredXrayRequests(filteredAppointments);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch X-Ray requests");
      setXrayRequests([]);
      setFilteredXrayRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSelect = (appointment) => {
    setSelectedAppointment(appointment);
  };

  const handleRequestCreated = () => {
    fetchXrayRequests();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (!selectedBranch) {
    return (
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
        Please select a branch to view X-Ray requests.
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            X-Ray Requests & Results
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Request X-Ray examinations for patients and view results
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <XrayRequestForm onRequestCreated={handleRequestCreated} />
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            All ({allXrayRequests.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === "pending"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Pending (
            {
              allXrayRequests.filter(
                (apt) => !apt.xrayResult || !apt.xrayResult.sentToDentist
              ).length
            }
            )
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              filter === "completed"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Results Received (
            {
              allXrayRequests.filter(
                (apt) => apt.xrayResult && apt.xrayResult.sentToDentist
              ).length
            }
            )
          </button>
        </div>
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient name, phone, email, card number, or date..."
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
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-500">
            {filteredXrayRequests.length} result
            {filteredXrayRequests.length !== 1 ? "s" : ""} found
            {filter !== "all" &&
              ` in ${filter === "pending" ? "Pending" : "Results Received"}`}
          </p>
        )}
      </div>

      {selectedAppointment ? (
        /* Full Screen Results View */
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSelectedAppointment(null)}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 min-h-[44px] text-sm font-medium"
              >
                ← Back to List
              </button>
              <div>
                <h2 className="text-lg md:text-xl font-bold">
                  {selectedAppointment.xrayResult?.sentToDentist
                    ? "X-Ray Results"
                    : "Pending X-Ray Request"}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedAppointment.patientName} -{" "}
                  {formatDate(selectedAppointment.date)}
                </p>
              </div>
            </div>
            <button
              onClick={fetchXrayRequests}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 min-h-[44px] text-sm"
            >
              Refresh
            </button>
          </div>
          <XrayRequests appointment={selectedAppointment} />
        </div>
      ) : (
        /* X-Ray Requests List */
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg md:text-xl font-bold">
              {filter === "completed"
                ? "X-Ray Results Received"
                : filter === "pending"
                ? "Pending X-Ray Requests"
                : "My X-Ray Requests"}
            </h2>
            <button
              onClick={fetchXrayRequests}
              className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 min-h-[44px] text-sm"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="mt-2 text-gray-500">Loading requests...</p>
            </div>
          ) : filteredXrayRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {searchQuery
                ? "No X-Ray requests found matching your search."
                : "No X-Ray requests. Create a new request to get started."}
            </p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredXrayRequests.map((appointment) => (
                <div
                  key={appointment.id}
                  onClick={() => handleRequestSelect(appointment)}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedAppointment?.id === appointment.id
                      ? "border-indigo-500 bg-indigo-50"
                      : appointment.xrayResult?.sentToDentist
                      ? "border-green-300 bg-green-50 hover:bg-green-100"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base md:text-lg">
                        {appointment.patientName}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {formatDate(appointment.date)}
                      </p>
                      {appointment.xrayResult && (
                        <div className="mt-2">
                          <span
                            className={`text-sm ${
                              appointment.xrayResult.sentToDentist
                                ? "text-green-600"
                                : "text-yellow-600"
                            }`}
                          >
                            {appointment.xrayResult.sentToDentist
                              ? "✓ Result available"
                              : "⏳ Waiting for result"}
                          </span>
                        </div>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                        appointment.xrayResult?.sentToDentist
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {appointment.xrayResult?.sentToDentist
                        ? "Complete"
                        : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DentistXrayRequestsView;
