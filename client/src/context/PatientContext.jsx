import { createContext, useState, useCallback, useEffect } from "react";
import api from "../services/api";
import useBranch from "../hooks/useBranch";

const PatientContext = createContext();

export const PatientProvider = ({ children }) => {
  const { selectedBranch } = useBranch();
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  // Fetch patients from API
  const fetchPatients = useCallback(async () => {
    if (!selectedBranch?.id) {
      return;
    }

    try {
      setIsLoading(true);
      // Use /patients endpoint (not /search) to get all patients
      // /search requires a name parameter and has max limit of 100
      // /patients allows getting all patients with higher limit
      const params = { limit: 100 };
      if (selectedBranch?.id) {
        params.branchId = selectedBranch.id;
      }
      const response = await api.get("/patients", { params });
      const responseData = response.data?.data || response.data || {};
      // Handle both array response and object with patients property
      const patientsData = Array.isArray(responseData)
        ? responseData
        : responseData.patients || [];
      setPatients(Array.isArray(patientsData) ? patientsData : []);
      setLastFetchTime(new Date());
    } catch (err) {
      console.error("Error fetching patients:", err);
      // Don't set empty array on error, keep existing patients
      // Only set empty if it's a 401/403 (auth error)
      if (err.response?.status === 401 || err.response?.status === 403) {
        setPatients([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranch]);

  // Initial fetch when branch is selected
  useEffect(() => {
    if (selectedBranch?.id) {
      fetchPatients();
    }
  }, [selectedBranch, fetchPatients]);

  // Add new patient to the list
  const addPatient = useCallback((patient) => {
    if (!patient || !patient.id) {
      console.warn("Invalid patient data provided to addPatient");
      return;
    }

    setPatients((prevPatients) => {
      // Check if patient already exists
      const exists = prevPatients.some((p) => p.id === patient.id);
      if (exists) {
        // Update existing patient
        return prevPatients.map((p) => (p.id === patient.id ? patient : p));
      }
      // Add new patient at the beginning
      return [patient, ...prevPatients];
    });
  }, []);

  // Update existing patient in the list
  const updatePatient = useCallback((patientId, updates) => {
    setPatients((prevPatients) =>
      prevPatients.map((p) => (p.id === patientId ? { ...p, ...updates } : p))
    );
  }, []);

  // Remove patient from the list
  const removePatient = useCallback((patientId) => {
    setPatients((prevPatients) =>
      prevPatients.filter((p) => p.id !== patientId)
    );
  }, []);

  // Set selected patient
  const setSelectedPatientState = useCallback((patient) => {
    setSelectedPatient(patient);
  }, []);

  // Clear selected patient
  const clearSelectedPatient = useCallback(() => {
    setSelectedPatient(null);
  }, []);

  // Refresh patients list
  const refreshPatients = useCallback(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Get patient by ID
  const getPatientById = useCallback(
    (patientId) => {
      return patients.find((p) => p.id === patientId) || null;
    },
    [patients]
  );

  // Get recent patients (last 10)
  const getRecentPatients = useCallback(() => {
    return patients.slice(0, 10);
  }, [patients]);

  const value = {
    // State
    patients,
    selectedPatient,
    isLoading,
    lastFetchTime,

    // Actions
    addPatient,
    updatePatient,
    removePatient,
    setSelectedPatient: setSelectedPatientState,
    clearSelectedPatient,
    refreshPatients,
    fetchPatients,

    // Getters
    getPatientById,
    getRecentPatients,
  };

  return (
    <PatientContext.Provider value={value}>{children}</PatientContext.Provider>
  );
};

export { PatientContext };
