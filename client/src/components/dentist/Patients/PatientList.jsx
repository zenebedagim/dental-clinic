import { useState, useEffect } from "react";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";

const PatientList = ({ onSelectPatient = () => {} }) => {
  const { selectedBranch } = useBranch();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedBranch?.id) {
      fetchAppointments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch]);

  // Listen for appointment creation events to refresh the list
  useEffect(() => {
    const handleAppointmentCreated = () => {
      if (selectedBranch?.id) {
        fetchAppointments();
      }
    };

    window.addEventListener("appointment-created", handleAppointmentCreated);
    return () => {
      window.removeEventListener("appointment-created", handleAppointmentCreated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBranch]);

  const fetchAppointments = async () => {
    if (!selectedBranch?.id) {
      return;
    }
    try {
      setLoading(true);
      const response = await api.get("/appointments/dentist", {
        params: { branchId: selectedBranch.id },
      });
      const data = response.data?.data || response.data || [];
      setAppointments(data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch appointments");
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
        Please select a branch to view patients.
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-8">Loading patients...</div>;
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
        <h2 className="text-xl font-bold">My Patients</h2>
        <button
          onClick={fetchAppointments}
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
        >
          Refresh
        </button>
      </div>
      {appointments.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No patients assigned</p>
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              onClick={() => onSelectPatient(appointment)}
              className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">
                    {appointment.patientName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Date: {formatDate(appointment.date)}
                  </p>
                  {appointment.treatment && (
                    <p className="text-sm text-blue-600 mt-1">
                      Treatment Status: {appointment.treatment.status}
                    </p>
                  )}
                </div>
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    appointment.status === "COMPLETED"
                      ? "bg-green-100 text-green-800"
                      : appointment.status === "IN_PROGRESS"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {appointment.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PatientList;
