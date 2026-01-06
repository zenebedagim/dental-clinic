import { useState, useEffect, useCallback, useRef } from "react";
import api from "../../../services/api";
import { useToast } from "../../../hooks/useToast";
import DataTable from "../../common/DataTable";
import Loader from "../../common/Loader";
import Modal from "../../common/Modal";
import XrayImageViewer from "../../common/XrayImageViewer";
import { formatDate } from "../../../utils/tableUtils";

const AdminXrayManagement = () => {
  const [xrayUsers, setXrayUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [xrayRequests, setXrayRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [xrayLoading, setXrayLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("users"); // users, requests, patient-history

  // Patient X-Ray history state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientXrayHistory, setPatientXrayHistory] = useState([]);
  const [patientLoading, setPatientLoading] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const searchTimeoutRef = useRef(null);

  // X-Ray request detail modal
  const [selectedXrayRequest, setSelectedXrayRequest] = useState(null);
  const [xrayDetailModalOpen, setXrayDetailModalOpen] = useState(false);

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

  // Fetch X-Ray users
  const fetchXrayUsers = useCallback(
    async (branchId = null) => {
      try {
        setLoading(true);
        const params = { role: "XRAY" };
        if (branchId) {
          params.branchId = branchId;
        }
        const response = await api.get("/users", { params });
        const usersData = response.data?.data || response.data || [];
        setXrayUsers(Array.isArray(usersData) ? usersData : []);
      } catch (err) {
        console.error("Error fetching X-Ray users:", err);
        showError("Failed to load X-Ray users");
      } finally {
        setLoading(false);
      }
    },
    [showError]
  );

  // Fetch X-Ray requests
  const fetchXrayRequests = useCallback(
    async (branchId = null) => {
      try {
        setXrayLoading(true);
        const params = {};
        if (branchId) {
          params.branchId = branchId;
        }
        const response = await api.get("/xray", { params });
        const requestsData = response.data?.data || response.data || [];
        setXrayRequests(Array.isArray(requestsData) ? requestsData : []);
      } catch (err) {
        console.error("Error fetching X-Ray requests:", err);
        showError("Failed to load X-Ray requests");
        setXrayRequests([]);
      } finally {
        setXrayLoading(false);
      }
    },
    [showError]
  );

  useEffect(() => {
    fetchBranches();
    fetchXrayUsers(); // Fetch all X-Ray users for the users tab
  }, [fetchBranches, fetchXrayUsers]);

  useEffect(() => {
    // Clear branch data when switching away from requests tab
    if (activeTab !== "requests") {
      setXrayRequests([]);
      setSelectedBranch(null);
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedBranch?.id && activeTab === "requests") {
      fetchXrayRequests(selectedBranch.id);
    } else if (activeTab === "requests") {
      // Fetch all requests when no branch selected
      fetchXrayRequests(null);
    }
  }, [selectedBranch, activeTab, fetchXrayRequests]);

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

  // Fetch patient X-Ray history
  const fetchPatientXrayHistory = useCallback(async (patientId) => {
    if (!patientId) return;

    try {
      setPatientLoading(true);
      // Fetch all X-Ray requests (admin can see all)
      const response = await api.get("/xray", {});
      const requestsData = response.data?.data || response.data || [];

      // Filter to only appointments for this patient
      const patientRequests = Array.isArray(requestsData)
        ? requestsData.filter(
            (req) =>
              req.patientId === patientId || req.patient?.id === patientId
          )
        : [];

      setPatientXrayHistory(patientRequests);
    } catch (err) {
      console.error("Error fetching patient X-Ray history:", err);
      setPatientXrayHistory([]);
    } finally {
      setPatientLoading(false);
    }
  }, []);

  const handlePatientSelect = async (patient) => {
    setSelectedPatient(patient);
    setDetailModalOpen(true);
    await fetchPatientXrayHistory(patient.id);
  };

  const handleXrayRequestClick = (request) => {
    setSelectedXrayRequest(request);
    setXrayDetailModalOpen(true);
  };

  const xrayUserColumns = [
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

  const xrayRequestColumns = [
    {
      key: "patientName",
      label: "Patient",
      render: (value, row) => row.patient?.name || row.patientName || "N/A",
      sortable: true,
    },
    {
      key: "date",
      label: "Appointment Date",
      render: (value) => formatDate(value),
      sortable: true,
    },
    {
      key: "branch.name",
      label: "Branch",
      render: (value, row) => row.branch?.name || "N/A",
      sortable: true,
    },
    {
      key: "dentist.name",
      label: "Dentist",
      render: (value, row) => row.dentist?.name || "N/A",
      sortable: true,
    },
    {
      key: "xrayResult",
      label: "Status",
      render: (value, row) => {
        if (row.xrayResult?.id) {
          return (
            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
              Completed
            </span>
          );
        }
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      },
    },
    {
      key: "xrayResult.updatedAt",
      label: "Completed Date",
      render: (value, row) =>
        row.xrayResult?.updatedAt ? formatDate(row.xrayResult.updatedAt) : "—",
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
          X-Ray Management
        </h1>
        <p className="mt-2 text-sm text-gray-600 md:text-base">
          Manage X-Ray users and view X-Ray history
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
            X-Ray Users ({xrayUsers.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "requests"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            X-Ray Requests ({xrayRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("patient-history")}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "patient-history"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Patient X-Ray History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "users" && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">
            All X-Ray Users
          </h2>
          <DataTable
            data={xrayUsers}
            columns={xrayUserColumns}
            title="X-Ray Users"
            emptyMessage="No X-Ray users found"
            searchable={true}
            sortable={true}
            pagination={true}
            pageSize={10}
            exportable={true}
            printable={true}
          />
        </div>
      )}

      {activeTab === "requests" && (
        <div className="space-y-6">
          {/* Branch Selector */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <label
              htmlFor="branch-select-requests"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Filter by Branch (Optional)
            </label>
            <select
              id="branch-select-requests"
              value={selectedBranch?.id || ""}
              onChange={(e) => {
                const branch = branches.find((b) => b.id === e.target.value);
                setSelectedBranch(branch || null);
              }}
              className="mt-1 block w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} ({branch.code})
                </option>
              ))}
            </select>
          </div>

          {/* X-Ray Requests Table */}
          <div className="bg-white rounded-lg shadow-md p-6">
            {xrayLoading ? (
              <Loader />
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    X-Ray Requests
                    {selectedBranch && ` - ${selectedBranch.name}`}
                  </h3>
                  <span className="text-sm text-gray-600">
                    Total: {xrayRequests.length}
                  </span>
                </div>
                <DataTable
                  data={xrayRequests}
                  columns={xrayRequestColumns}
                  title="X-Ray Requests"
                  emptyMessage="No X-Ray requests found"
                  searchable={true}
                  sortable={true}
                  pagination={true}
                  pageSize={20}
                  exportable={true}
                  printable={true}
                  onRowClick={handleXrayRequestClick}
                />
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === "patient-history" && (
        <div className="space-y-6">
          {/* Patient Search */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Search Patient to View X-Ray History
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

          {/* Patient X-Ray History Modal */}
          <Modal
            isOpen={detailModalOpen}
            onClose={() => {
              setDetailModalOpen(false);
              setSelectedPatient(null);
              setPatientXrayHistory([]);
            }}
            title={`X-Ray History: ${selectedPatient?.name || ""}`}
            size="xl"
          >
            {patientLoading ? (
              <Loader />
            ) : selectedPatient && patientXrayHistory.length > 0 ? (
              <div className="space-y-4 max-h-[80vh] overflow-y-auto">
                {patientXrayHistory.map((request) => (
                  <div
                    key={request.id}
                    className="border border-gray-200 rounded-md p-4 bg-white"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium text-gray-900 mb-1">
                          {formatDate(request.date)}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <div>
                            <strong>Branch:</strong>{" "}
                            {request.branch?.name || "N/A"} (
                            {request.branch?.code || "N/A"})
                          </div>
                          <div>
                            <strong>Dentist:</strong>{" "}
                            {request.dentist?.name || "N/A"}
                          </div>
                        </div>
                      </div>
                      {request.xrayResult?.id ? (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Completed
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                    </div>
                    {request.xrayResult && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <XrayImageViewer
                          xrayId={request.xrayResult.id}
                          canDelete={false}
                          onImagesChange={() => {}}
                        />
                        {request.xrayResult.result && (
                          <div className="mt-3">
                            <strong className="text-sm text-gray-700">
                              Findings:
                            </strong>
                            <p className="text-sm text-gray-600 mt-1">
                              {request.xrayResult.result}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                {selectedPatient
                  ? "No X-Ray history found for this patient"
                  : "Select a patient to view X-Ray history"}
              </div>
            )}
          </Modal>
        </div>
      )}

      {/* X-Ray Request Detail Modal */}
      <Modal
        isOpen={xrayDetailModalOpen}
        onClose={() => {
          setXrayDetailModalOpen(false);
          setSelectedXrayRequest(null);
        }}
        title={`X-Ray Request Details`}
        size="xl"
      >
        {selectedXrayRequest ? (
          <div className="space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Patient Info */}
            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="font-semibold text-gray-900 mb-2">
                Patient Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>{" "}
                  <span className="font-medium">
                    {selectedXrayRequest.patient?.name ||
                      selectedXrayRequest.patientName ||
                      "N/A"}
                  </span>
                </div>
                {selectedXrayRequest.patient?.phone && (
                  <div>
                    <span className="text-gray-600">Phone:</span>{" "}
                    <span className="font-medium">
                      {selectedXrayRequest.patient.phone}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Appointment Date:</span>{" "}
                  <span className="font-medium">
                    {formatDate(selectedXrayRequest.date)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Branch:</span>{" "}
                  <span className="font-medium">
                    {selectedXrayRequest.branch?.name || "N/A"} (
                    {selectedXrayRequest.branch?.code || "N/A"})
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Dentist:</span>{" "}
                  <span className="font-medium">
                    {selectedXrayRequest.dentist?.name || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* X-Ray Result */}
            {selectedXrayRequest.xrayResult ? (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  X-Ray Results
                </h3>
                <XrayImageViewer
                  xrayId={selectedXrayRequest.xrayResult.id}
                  canDelete={false}
                  onImagesChange={() => {}}
                />
                {selectedXrayRequest.xrayResult.result && (
                  <div className="mt-4">
                    <strong className="text-sm text-gray-700">Findings:</strong>
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                      {selectedXrayRequest.xrayResult.result}
                    </p>
                  </div>
                )}
                {selectedXrayRequest.xrayResult.xrayType && (
                  <div className="mt-2">
                    <strong className="text-sm text-gray-700">Type:</strong>{" "}
                    <span className="text-sm text-gray-600">
                      {selectedXrayRequest.xrayResult.xrayType.replace(
                        /_/g,
                        " "
                      )}
                    </span>
                  </div>
                )}
                {selectedXrayRequest.xrayResult.updatedAt && (
                  <div className="mt-2 text-xs text-gray-500">
                    Completed:{" "}
                    {formatDate(selectedXrayRequest.xrayResult.updatedAt)}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                X-Ray results not yet uploaded
              </div>
            )}
          </div>
        ) : (
          <Loader />
        )}
      </Modal>
    </div>
  );
};

export default AdminXrayManagement;
