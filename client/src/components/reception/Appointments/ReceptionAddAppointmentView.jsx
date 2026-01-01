import { useNavigate } from "react-router-dom";
import AppointmentForm from "./AppointmentForm";

const ReceptionAddAppointmentView = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Add Appointment</h1>
        <p className="mt-2 text-sm text-gray-600 sm:text-base">
          Schedule a new patient visit
        </p>
      </div>

      <AppointmentForm onAppointmentCreated={() => {
        // Redirect to appointments list after creation
        navigate("/reception/appointments");
      }} />
    </div>
  );
};

export default ReceptionAddAppointmentView;

