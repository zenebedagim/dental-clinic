import { useNavigate } from "react-router-dom";
import PatientList from "./PatientList";

const DentistPatientsView = () => {
  const navigate = useNavigate();

  const handleSelectPatient = (appointment) => {
    // Navigate to treatment page with appointment data
    navigate("/dentist/treatment", {
      state: { appointment },
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Patients</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">
          View and select appointments for treatment
        </p>
      </div>
      <PatientList onSelectPatient={handleSelectPatient} />
    </div>
  );
};

export default DentistPatientsView;

