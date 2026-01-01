import { useLocation } from "react-router-dom";
import TreatmentFormEnhanced from "./TreatmentFormEnhanced";

const DentistTreatmentView = () => {
  const location = useLocation();
  const appointment = location.state?.appointment || null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Treatment Form</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">
          {appointment
            ? `Create treatment record for ${appointment.patientName}`
            : "Create treatment records"}
        </p>
      </div>

      <TreatmentFormEnhanced appointment={appointment} />
    </div>
  );
};

export default DentistTreatmentView;
