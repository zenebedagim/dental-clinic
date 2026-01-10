import { useState, useEffect } from "react";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import { XRAY_TYPES } from "../../../utils/dentalConstants";

const XrayRequestList = ({ onSelectRequest, filter = "all" }) => {
  const { selectedBranch } = useBranch();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRequests = async () => {
    if (!selectedBranch?.id) {
      return;
    }
    try {
      setLoading(true);
      // Pass filter to server for server-side filtering (more efficient)
      const response = await api.get("/xray", {
        params: {
          branchId: selectedBranch.id,
          filter: filter, // Server will filter the results
        },
      });
      const data = response.data?.data || response.data || [];
      setAppointments(data); // Server already filtered the results
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch X-Ray requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBranch?.id) {
      fetchRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch, filter]); // Refetch when filter changes

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

  if (loading) {
    return <div className="text-center py-8">Loading X-Ray requests...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">X-Ray Requests</h2>
        <button
          onClick={fetchRequests}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Refresh
        </button>
      </div>
      {appointments.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No X-Ray requests</p>
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              onClick={() => onSelectRequest(appointment)}
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                appointment.xrayResult
                  ? "border-green-300 bg-green-50 hover:bg-green-100"
                  : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {appointment.patientName || appointment.patient?.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Date: {formatDate(appointment.date)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Dentist: {appointment.dentist?.name || "N/A"}
                  </p>
                  
                  {/* Investigation / X-Ray Type - Always Display */}
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-700 mb-1">
                      Investigation / X-Ray Type:
                    </p>
                    <p className="text-xs text-gray-600">
                      {appointment.xrayType ? (() => {
                        const xrayTypeObj = XRAY_TYPES.find(t => t.value === appointment.xrayType);
                        if (xrayTypeObj) {
                          return xrayTypeObj.abbreviation 
                            ? `[${xrayTypeObj.abbreviation}] ${xrayTypeObj.name}`
                            : xrayTypeObj.name;
                        }
                        return appointment.xrayType.replace(/_/g, " ");
                      })() : "—"}
                    </p>
                  </div>

                  {/* Urgency - Always Display */}
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-700 mb-1">
                      Urgency:
                    </p>
                    <p className="text-xs text-gray-600">
                      {appointment.urgency || "—"}
                    </p>
                  </div>

                  {/* Notes/Instructions - Always Display */}
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-700 mb-1">
                      Notes/Instructions:
                    </p>
                    <p className="text-xs text-gray-600 whitespace-pre-wrap">
                      {appointment.notes || "—"}
                    </p>
                  </div>
                  {appointment.xrayResult && (
                    <p className="text-sm text-green-600 mt-2">
                      Result{" "}
                      {appointment.xrayResult.sentToDentist
                        ? "sent"
                        : "pending send"}
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    appointment.xrayResult
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {appointment.xrayResult ? "Has Result" : "Pending"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default XrayRequestList;
