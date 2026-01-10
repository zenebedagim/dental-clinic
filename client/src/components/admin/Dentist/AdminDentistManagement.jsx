import { useState, useEffect, useCallback, useRef } from "react";
import api from "../../../services/api";
import { useToast } from "../../../hooks/useToast";
import DataTable from "../../common/DataTable";
import Loader from "../../common/Loader";
import Modal from "../../common/Modal";
import { formatDate } from "../../../utils/tableUtils";
import TreatmentHistoryTable from "../../dentist/Patients/TreatmentHistoryTable";
import TreatmentDetailModal from "../../dentist/Patients/TreatmentDetailModal";

// Helper function to format currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-ET", {
    style: "currency",
    currency: "ETB",
  }).format(amount || 0);
};

const AdminDentistManagement = () => {
  const [dentistUsers, setDentistUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [branchPatients, setBranchPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("users"); // users, appointments, patient-details

  // Patient details state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [patientHistory, setPatientHistory] = useState(null); // Full history like dentist view
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  const [treatmentModalOpen, setTreatmentModalOpen] = useState(false);
  const [patientLoading, setPatientLoading] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const searchTimeoutRef = useRef(null);

  const { error: showError } = useToast();

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    try {
      const response = await api.get("/branches");
      const branchesData = response.data?.data || response.data || [];
      setBranches(
        Array.isArray(branchesData)
          ? branchesData.filter((b) => b.isActive)
          : []
      );
    } catch (err) {
      console.error("Error fetching branches:", err);
      showError("Failed to load branches");
    }
  }, [showError]);

  // Fetch dentist users
  const fetchDentistUsers = useCallback(
    async (branchId = null) => {
      try {
        setLoading(true);
        const params = { role: "DENTIST" };
        if (branchId) {
          params.branchId = branchId;
        }
        const response = await api.get("/users", { params });
        const usersData = response.data?.data || response.data || [];
        setDentistUsers(Array.isArray(usersData) ? usersData : []);
      } catch (err) {
        console.error("Error fetching dentist users:", err);
        showError("Failed to load dentist users");
      } finally {
        setLoading(false);
      }
    },
    [showError]
  );

  // Fetch patients for a branch
  const fetchBranchPatients = useCallback(
    async (branchId) => {
      if (!branchId) {
        setBranchPatients([]);
        return;
      }

      try {
        setStatsLoading(true);
        const response = await api.get("/patients", {
          params: { branchId, limit: 1000 },
        });
        const patientsData = response.data?.data || response.data || [];
        setBranchPatients(Array.isArray(patientsData) ? patientsData : []);
      } catch (err) {
        console.error("Error fetching patients:", err);
        showError("Failed to load patients");
        setBranchPatients([]);
      } finally {
        setStatsLoading(false);
      }
    },
    [showError]
  );

  useEffect(() => {
    fetchBranches();
    fetchDentistUsers(); // Fetch all dentist users for the users tab
  }, [fetchBranches, fetchDentistUsers]);

  useEffect(() => {
    // Clear branch data when switching away from patients tab
    if (activeTab !== "appointments") {
      setBranchPatients([]);
      setSelectedBranch(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedBranch?.id && activeTab === "appointments") {
      fetchBranchPatients(selectedBranch.id);
    } else if (activeTab === "appointments") {
      // Clear patients when branch is deselected but tab is still active
      setBranchPatients([]);
    }
  }, [selectedBranch, activeTab, fetchBranchPatients]);

  // Patient search functionality
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchPatients(searchQuery.trim());
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const searchPatients = async (query) => {
    try {
      setPatientLoading(true);
      const response = await api.get("/patients/search", {
        params: { name: query, limit: 20 },
      });
      const patients = response.data?.data || response.data || [];
      setSearchResults(patients);
    } catch (err) {
      console.error("Error searching patients:", err);
      setSearchResults([]);
    } finally {
      setPatientLoading(false);
    }
  };

  // Fetch complete patient details - same as dentist view
  const fetchPatientDetails = useCallback(
    async (patientId, branchId) => {
      if (!patientId) return;

      try {
        setPatientLoading(true);

        // Fetch complete patient history (same endpoint as dentist view)
        const response = await api.get(`/history/patient/${patientId}`, {
          params: branchId ? { branchId } : {},
        });

        // Handle both response formats: { data: {...} } or direct object
        const history = response.data?.data || response.data || {};

        // Set patient details from history
        setPatientDetails(history.patient || selectedPatient);

        // Set full history (treatments, appointments, xrayResults, payments)
        setPatientHistory({
          treatments: history.treatments || [],
          appointments: history.appointments || [],
          xrayResults: history.xrayResults || [],
          payments: history.payments || [],
          patient: history.patient || selectedPatient,
        });
      } catch (err) {
        console.error("Error fetching patient details:", err);
        showError("Failed to load patient details");
      } finally {
        setPatientLoading(false);
      }
    },
    [showError, selectedPatient]
  );

  const handlePatientSelect = async (patient) => {
    setSelectedPatient(patient);
    setDetailModalOpen(true);
    // Fetch details for all branches (admin can see all) - no branch filter
    await fetchPatientDetails(patient.id, null);
  };

  const handleTreatmentSelect = (treatmentOrAppointment) => {
    // When clicking on a treatment in TreatmentHistoryTable, open the modal
    setSelectedTreatment(treatmentOrAppointment);
    setTreatmentModalOpen(true);
  };

  const handleCloseTreatmentModal = () => {
    setTreatmentModalOpen(false);
    setSelectedTreatment(null);
  };

  const handlePatientRowClick = async (patient) => {
    // Switch to patient details tab
    setActiveTab("patient-details");
    // Select the patient and show details
    await handlePatientSelect(patient);
  };

  // Listen for treatment saved events to refresh patient details if that patient is selected
  useEffect(() => {
    const handleTreatmentSaved = (event) => {
      const { patientId } = event.detail || {};

      // If we have a selected patient and it matches the saved treatment's patient, refresh
      if (selectedPatient?.id === patientId && detailModalOpen) {
        fetchPatientDetails(patientId, null);
      }
    };

    window.addEventListener("treatment-saved", handleTreatmentSaved);
    return () => {
      window.removeEventListener("treatment-saved", handleTreatmentSaved);
    };
  }, [selectedPatient, detailModalOpen, fetchPatientDetails]);

  const dentistUserColumns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
    },
    {
      key: "branch.name",
      label: "Branch",
      render: (value, row) => row.branch?.name || "N/A",
      sortable: true,
    },
    {
      key: "branch.code",
      label: "Branch Code",
      render: (value, row) => row.branch?.code || "N/A",
      sortable: true,
    },
    {
      key: "createdAt",
      label: "Created At",
      render: (value) => formatDate(value),
      sortable: true,
    },
  ];

  const patientColumns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
    },
    {
      key: "phone",
      label: "Phone",
      sortable: true,
      render: (value) => value || "—",
    },
    {
      key: "email",
      label: "Email",
      sortable: true,
      render: (value) => value || "—",
    },
    {
      key: "gender",
      label: "Gender",
      render: (value) => value || "—",
    },
    {
      key: "dateOfBirth",
      label: "Date of Birth",
      render: (value) => (value ? formatDate(value) : "—"),
    },
    {
      key: "cardNo",
      label: "Card No",
      render: (value) => value || "—",
    },
    {
      key: "createdAt",
      label: "Created At",
      render: (value) => formatDate(value),
      sortable: true,
    },
  ];

  if (loading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
          Dentist Management
        </h1>
        <p className="mt-2 text-sm text-gray-600 md:text-base">
          Manage dentist users and view patient information
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("users")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "users"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Dentist Users ({dentistUsers.length})
          </button>
          <button
            onClick={() => setActiveTab("appointments")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "appointments"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Patients by Branch
          </button>
          <button
            onClick={() => setActiveTab("patient-details")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "patient-details"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Patient Details
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "users" && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            All Dentist Users
          </h2>
          <DataTable
            data={dentistUsers}
            columns={dentistUserColumns}
            title="Dentist Users"
            emptyMessage="No dentist users found"
            searchable={true}
            sortable={true}
            pagination={true}
            pageSize={10}
            exportable={true}
            printable={true}
          />
        </div>
      )}

      {activeTab === "appointments" && (
        <div className="space-y-6">
          {/* Branch Selector */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <label
              htmlFor="branch-select-patients"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Select Branch to View Patients
            </label>
            <select
              id="branch-select-patients"
              value={selectedBranch?.id || ""}
              onChange={(e) => {
                const branch = branches.find((b) => b.id === e.target.value);
                setSelectedBranch(branch || null);
              }}
              className="mt-1 block w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select a branch...</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} ({branch.code})
                </option>
              ))}
            </select>
          </div>

          {/* Patients Table */}
          {selectedBranch && (
            <div className="bg-white rounded-lg shadow-md p-6">
              {statsLoading ? (
                <Loader />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">
                      Patients for {selectedBranch.name}
                    </h3>
                    <span className="text-sm text-gray-600">
                      Total: {branchPatients.length}
                    </span>
                  </div>
                  <DataTable
                    data={branchPatients}
                    columns={patientColumns}
                    title="Patients"
                    emptyMessage="No patients found for this branch"
                    searchable={true}
                    sortable={true}
                    pagination={true}
                    pageSize={20}
                    exportable={true}
                    printable={true}
                    onRowClick={handlePatientRowClick}
                  />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === "patient-details" && (
        <div className="space-y-6">
          {/* Patient Search */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Search Patient to View Complete Details
            </h2>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type patient name to search..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {patientLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                </div>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="mt-4 border border-gray-200 rounded-md max-h-60 overflow-y-auto">
                {searchResults.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => handlePatientSelect(patient)}
                    className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-gray-900">
                      {patient.name}
                    </div>
                    {patient.phone && (
                      <div className="text-sm text-gray-500">
                        {patient.phone}
                      </div>
                    )}
                    {patient.email && (
                      <div className="text-sm text-gray-500">
                        {patient.email}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 &&
              searchResults.length === 0 &&
              !patientLoading && (
                <div className="mt-4 text-center text-gray-500 text-sm">
                  No patients found
                </div>
              )}
          </div>

          {/* Patient Details Modal */}
          <Modal
            isOpen={detailModalOpen}
            onClose={() => {
              setDetailModalOpen(false);
              setSelectedPatient(null);
              setPatientDetails(null);
              setPatientHistory(null);
            }}
            title={`Complete Patient Details: ${selectedPatient?.name || ""}`}
            size="xl"
          >
            {patientLoading ? (
              <Loader />
            ) : selectedPatient && patientDetails ? (
              <div className="space-y-6 max-h-[80vh] overflow-y-auto">
                {/* Patient Basic Information */}
                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">
                    Patient Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>{" "}
                      <span className="font-medium">{patientDetails.name}</span>
                    </div>
                    {patientDetails.phone && (
                      <div>
                        <span className="text-gray-600">Phone:</span>{" "}
                        <span className="font-medium">
                          {patientDetails.phone}
                        </span>
                      </div>
                    )}
                    {patientDetails.email && (
                      <div>
                        <span className="text-gray-600">Email:</span>{" "}
                        <span className="font-medium">
                          {patientDetails.email}
                        </span>
                      </div>
                    )}
                    {patientDetails.gender && (
                      <div>
                        <span className="text-gray-600">Gender:</span>{" "}
                        <span className="font-medium">
                          {patientDetails.gender}
                        </span>
                      </div>
                    )}
                    {patientDetails.dateOfBirth && (
                      <div>
                        <span className="text-gray-600">Date of Birth:</span>{" "}
                        <span className="font-medium">
                          {formatDate(patientDetails.dateOfBirth)}
                        </span>
                      </div>
                    )}
                    {patientDetails.cardNo && (
                      <div>
                        <span className="text-gray-600">Card Number:</span>{" "}
                        <span className="font-medium">
                          {patientDetails.cardNo}
                        </span>
                      </div>
                    )}
                    {patientDetails.address && (
                      <div className="sm:col-span-2">
                        <span className="text-gray-600">Address:</span>{" "}
                        <span className="font-medium">
                          {patientDetails.address}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Treatment History Table - Same as Dentist View */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 text-lg">
                    Treatment History
                  </h3>
                  {patientHistory ? (
                    <TreatmentHistoryTable
                      treatments={patientHistory.treatments || []}
                      appointments={patientHistory.appointments || []}
                      onTreatmentSelect={handleTreatmentSelect}
                    />
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No treatment history available
                    </p>
                  )}
                </div>

                {/* Payments - Most Recent First */}
                {patientHistory?.payments &&
                  patientHistory.payments.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 text-lg">
                        All Payments ({patientHistory.payments.length}) - Most
                        Recent First
                      </h3>
                      <div className="space-y-3">
                        {patientHistory.payments
                          .sort(
                            (a, b) =>
                              new Date(b.date || b.paymentDate) -
                              new Date(a.date || a.paymentDate)
                          )
                          .map((payment) => (
                            <div
                              key={payment.id}
                              className="border border-gray-200 rounded-md p-4 bg-white"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900 mb-1">
                                    {formatDate(
                                      payment.date || payment.paymentDate
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-600 space-y-1">
                                    <div>
                                      <strong>Dentist:</strong>{" "}
                                      {payment.dentist ||
                                        payment.appointment?.dentist?.name ||
                                        "N/A"}
                                    </div>
                                    <div>
                                      <strong>Amount:</strong>{" "}
                                      <span className="font-semibold text-green-600">
                                        {formatCurrency(
                                          typeof payment.amount === "object" &&
                                            payment.amount?.toNumber
                                            ? payment.amount.toNumber()
                                            : parseFloat(payment.amount || 0)
                                        )}
                                      </span>
                                      {payment.paidAmount > 0 && (
                                        <span className="ml-2">
                                          (Paid:{" "}
                                          {formatCurrency(
                                            typeof payment.paidAmount ===
                                              "object" &&
                                              payment.paidAmount?.toNumber
                                              ? payment.paidAmount.toNumber()
                                              : parseFloat(
                                                  payment.paidAmount || 0
                                                )
                                          )}
                                          )
                                        </span>
                                      )}
                                    </div>
                                    {payment.paymentMethod && (
                                      <div>
                                        <strong>Method:</strong>{" "}
                                        {payment.paymentMethod}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <span
                                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    payment.paymentStatus === "PAID"
                                      ? "bg-green-100 text-green-800"
                                      : payment.paymentStatus === "PARTIAL"
                                      ? "bg-yellow-100 text-yellow-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {payment.paymentStatus}
                                </span>
                              </div>
                              {payment.isHidden && (
                                <div className="mt-2 pt-2 border-t border-gray-100">
                                  <span className="text-xs text-gray-500">
                                    🔒 Private Payment
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {selectedPatient
                  ? "Loading patient details..."
                  : "Select a patient to view details"}
              </div>
            )}
          </Modal>

          {/* Treatment Detail Modal - Same as Dentist View */}
          <TreatmentDetailModal
            isOpen={treatmentModalOpen}
            onClose={handleCloseTreatmentModal}
            treatment={selectedTreatment?.treatment || selectedTreatment}
            appointment={selectedTreatment}
            patient={
              patientHistory?.patient ||
              selectedPatient ||
              selectedTreatment?.patient
            }
          />
        </div>
      )}
    </div>
  );
};

export default AdminDentistManagement;
