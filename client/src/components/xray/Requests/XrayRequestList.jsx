import { useState, useEffect } from "react";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";

const XrayRequestList = ({ onSelectRequest }) => {
  const { selectedBranch } = useBranch();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedBranch?.id) {
      fetchRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch]);

  const fetchRequests = async () => {
    if (!selectedBranch?.id) {
      return;
    }
    try {
      setLoading(true);
      const response = await api.get("/xray", {
        params: { branchId: selectedBranch.id },
      });
      const data = response.data?.data || response.data || [];
      setAppointments(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch X-Ray requests");
    } finally {
      setLoading(false);
    }
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
                <div>
                  <h3 className="font-semibold text-lg">
                    {appointment.patientName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Date: {formatDate(appointment.date)}
                  </p>
                  <p className="text-sm text-gray-600">
                    Dentist: {appointment.dentist?.name || "N/A"}
                  </p>
                  {appointment.xrayResult && (
                    <p className="text-sm text-green-600 mt-1">
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
