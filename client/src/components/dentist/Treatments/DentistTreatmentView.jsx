import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../../services/api";
import TreatmentFormEnhanced from "./TreatmentFormEnhanced";

const DentistTreatmentView = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(
    location.state?.appointment || null
  );
  const [loading, setLoading] = useState(false);

  // If appointmentId is provided but not full appointment, fetch it
  useEffect(() => {
    const appointmentId = location.state?.appointmentId;

    if (appointmentId && !appointment) {
      // Use a function to set loading state asynchronously
      const fetchAppointment = async () => {
        setLoading(true);
        try {
          const response = await api.get(`/appointments/${appointmentId}`);
          const appointmentData = response.data?.data || response.data;
          setAppointment(appointmentData);
        } catch (err) {
          console.error("Error fetching appointment:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchAppointment();
    }
  }, [location.state, appointment]);

  const handleTreatmentSaved = () => {
    // Dispatch event for PatientList to listen
    const event = new CustomEvent("treatment-saved", {
      detail: {
        patientId: appointment?.patientId || appointment?.patient?.id,
        patientName: appointment?.patientName || appointment?.patient?.name,
        appointment: appointment,
      },
    });
    window.dispatchEvent(event);

    // Navigate to patients page with search mode enabled
    navigate("/dentist/patients", {
      state: {
        searchMode: true,
        patientId: appointment?.patientId || appointment?.patient?.id,
        patientName: appointment?.patientName || appointment?.patient?.name,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-b-2 border-indigo-600 rounded-full animate-spin"></div>
          <p className="mt-2 text-gray-500">Loading appointment...</p>
        </div>
      </div>
    );
  }

  return (
    <TreatmentFormEnhanced
      appointment={appointment}
      onTreatmentSaved={handleTreatmentSaved}
    />
  );
};

export default DentistTreatmentView;
