import { useContext } from "react";
import { PatientContext } from "../context/PatientContext";

/**
 * Custom hook to access patient context
 * @returns {Object} Patient context with state and methods
 */
const usePatient = () => {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error("usePatient must be used within a PatientProvider");
  }
  return context;
};

export default usePatient;
