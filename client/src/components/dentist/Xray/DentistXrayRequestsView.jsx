import { useState, useEffect } from "react";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import XrayRequestForm from "./XrayRequestForm";
import XrayRequests from "./XrayRequests";

const DentistXrayRequestsView = () => {
  const { selectedBranch } = useBranch();
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [xrayRequests, setXrayRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedBranch?.id) {
      fetchXrayRequests();
    }
  }, [selectedBranch]);

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
      const xrayAppointments = appointments.filter((apt) => apt.xrayId !== null);
      setXrayRequests(xrayAppointments);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch X-Ray requests");
      setXrayRequests([]);
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
            X-Ray Requests
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-2">
            Request X-Ray examinations for patients and view results
          </p>
        </div>
        <XrayRequestForm onRequestCreated={handleRequestCreated} />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* X-Ray Requests List */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg md:text-xl font-bold">My X-Ray Requests</h2>
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
          ) : xrayRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No X-Ray requests. Create a new request to get started.
            </p>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {xrayRequests.map((appointment) => (
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

        {/* X-Ray Results View */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
          <h2 className="text-lg md:text-xl font-bold mb-4">
            X-Ray Results
          </h2>
          {selectedAppointment ? (
            <XrayRequests appointment={selectedAppointment} />
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>Select an X-Ray request to view results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DentistXrayRequestsView;

