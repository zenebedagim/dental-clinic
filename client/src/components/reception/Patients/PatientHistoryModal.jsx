import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import usePatient from "../../../hooks/usePatient";
import Modal from "../../common/Modal";
import DataTable from "../../common/DataTable";
import { formatDate } from "../../../utils/tableUtils";

const PatientHistoryModal = ({ isOpen, onClose, patient: propPatient }) => {
  const { selectedBranch } = useBranch();
  const { selectedPatient: contextPatient } = usePatient();
  const navigate = useNavigate();
  // Use patient from prop if provided, otherwise use context selected patient
  const patient = propPatient || contextPatient;
  const [activeTab, setActiveTab] = useState("appointments");
  const [appointments, setAppointments] = useState([]);
  const [treatments, setTreatments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && patient?.id) {
      fetchPatientHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, patient]);

  // Listen for appointment creation events to auto-refresh patient history
  useEffect(() => {
    if (!isOpen || !patient?.id) return;

    const handleAppointmentCreated = () => {
      // Auto-refresh patient history when appointment is created
      fetchPatientHistory();
    };

    window.addEventListener("appointment-created", handleAppointmentCreated);
    return () => {
      window.removeEventListener(
        "appointment-created",
        handleAppointmentCreated
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, patient?.id]);

  const fetchPatientHistory = async () => {
    if (!patient?.id) return;

    // Use AbortController for request cancellation
    const abortController = new AbortController();

    try {
      setLoading(true);

      // Parallelize API calls for faster loading
      const [appointmentsResponse, historyResponse] = await Promise.all([
        api.get(`/appointments/patient/${patient.id}/sequence`, {
          params: { branchId: selectedBranch?.id },
          signal: abortController.signal,
        }),
        api.get(`/history/patient/${patient.id}`, {
          params: { branchId: selectedBranch?.id },
          signal: abortController.signal,
        }),
      ]);

      const appointmentsData =
        appointmentsResponse.data?.data || appointmentsResponse.data || {};
      setAppointments(appointmentsData.appointments || []);

      const history = historyResponse.data?.data || historyResponse.data || {};
      setTreatments(history.treatments || []);
      setPayments(history.payments || []);
    } catch (err) {
      // Ignore abort errors
      if (err.name === "AbortError") return;

      console.error("Error fetching patient history:", err);
    } finally {
      setLoading(false);
    }
  };

  const appointmentColumns = [
    {
      key: "treatmentNumber",
      label: "Treatment #",
      sortable: true,
      render: (value, row) => {
        if (value) {
          return (
            <div className="flex flex-col">
              <span className="font-semibold text-indigo-600">#{value}</span>
              <span className="text-xs text-gray-500">
                {row.treatmentSequence || ""}
              </span>
            </div>
          );
        }
        return "—";
      },
    },
    {
      key: "date",
      label: "Date & Time",
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: "dentist.name",
      label: "Dentist",
      sortable: true,
      render: (value, row) => row.dentist?.name || "N/A",
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            value === "COMPLETED"
              ? "bg-green-100 text-green-800"
              : value === "CANCELLED"
              ? "bg-red-100 text-red-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {value}
        </span>
      ),
    },
  ];

  const treatmentColumns = [
    {
      key: "appointment.date",
      label: "Date",
      sortable: true,
      render: (value, row) =>
        formatDate(row.appointment?.date || row.createdAt),
    },
    {
      key: "procedures",
      label: "Procedures",
      render: (value) => {
        if (!value || !Array.isArray(value)) return "—";
        return `${value.length} procedure(s)`;
      },
    },
    {
      key: "totalCost",
      label: "Total Cost",
      sortable: true,
      render: (value) =>
        value
          ? new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(value)
          : "—",
    },
  ];

  const paymentColumns = [
    {
      key: "date",
      label: "Date",
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: "amount",
      label: "Amount",
      sortable: true,
      render: (value) =>
        value
          ? new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(value)
          : "—",
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => (
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            value === "PAID"
              ? "bg-green-100 text-green-800"
              : "bg-yellow-100 text-yellow-800"
          }`}
        >
          {value || "PENDING"}
        </span>
      ),
    },
  ];

  const tabs = [
    { id: "appointments", label: "Appointments", count: appointments.length },
    { id: "treatments", label: "Treatments", count: treatments.length },
    { id: "payments", label: "Payments", count: payments.length },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Patient History: ${patient?.name || ""}`}
      size="xl"
    >
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-gray-500">Loading history...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Patient Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Name:</span>{" "}
                <span className="text-gray-900">{patient?.name}</span>
              </div>
              {patient?.phone && (
                <div>
                  <span className="font-medium text-gray-700">Phone:</span>{" "}
                  <span className="text-gray-900">{patient.phone}</span>
                </div>
              )}
              {patient?.email && (
                <div>
                  <span className="font-medium text-gray-700">Email:</span>{" "}
                  <span className="text-gray-900">{patient.email}</span>
                </div>
              )}
              {patient?.gender && (
                <div>
                  <span className="font-medium text-gray-700">Gender:</span>{" "}
                  <span className="text-gray-900">{patient.gender}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm min-h-[44px] ${
                    activeTab === tab.id
                      ? "border-indigo-500 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="min-h-[300px]">
            {activeTab === "appointments" && (
              <div className="space-y-4">
                {appointments.length > 0 && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        navigate("/reception/appointments");
                        onClose();
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm"
                    >
                      View All Appointments →
                    </button>
                  </div>
                )}
                <DataTable
                  data={appointments}
                  columns={appointmentColumns}
                  title="Appointments"
                  emptyMessage="No appointments found"
                  pageSize={5}
                  searchable={true}
                  sortable={true}
                  pagination={true}
                  exportable={false}
                  printable={false}
                />
              </div>
            )}

            {activeTab === "treatments" && (
              <DataTable
                data={treatments}
                columns={treatmentColumns}
                title="Treatments"
                emptyMessage="No treatments found"
                pageSize={5}
                searchable={true}
                sortable={true}
                pagination={true}
                exportable={false}
                printable={false}
              />
            )}

            {activeTab === "payments" && (
              <DataTable
                data={payments}
                columns={paymentColumns}
                title="Payments"
                emptyMessage="No payments found"
                pageSize={5}
                searchable={true}
                sortable={true}
                pagination={true}
                exportable={false}
                printable={false}
              />
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};

export default PatientHistoryModal;
