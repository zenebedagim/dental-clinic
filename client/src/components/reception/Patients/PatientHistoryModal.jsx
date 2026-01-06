import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import Modal from "../../common/Modal";
import { formatDate } from "../../../utils/tableUtils";
import {
  formatCurrency,
  formatPaymentStatus,
  toNumber,
} from "../shared/PaymentFormatter";

const PatientHistoryModal = ({ isOpen, onClose, patient }) => {
  const { selectedBranch } = useBranch();
  const [patientHistory, setPatientHistory] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Fetch patient appointments history (reception view - no treatments)
  const fetchPatientHistory = useCallback(
    async (patientId) => {
      if (!patientId || !selectedBranch?.id) return;

      setLoading(true);
      try {
        const response = await api.get(`/history/patient/${patientId}`, {
          params: { branchId: selectedBranch.id },
        });
        const history = response.data?.data || response.data || {};
        // Only keep appointments, remove treatments
        setPatientHistory({
          ...history,
          appointments: history.appointments || [],
          treatments: [], // Never show treatments in reception view
        });
      } catch (err) {
        console.error("Error fetching patient history:", err);
        setPatientHistory(null);
      } finally {
        setLoading(false);
      }
    },
    [selectedBranch]
  );

  // Fetch payments for this patient
  const fetchPatientPayments = useCallback(
    async (patientId) => {
      if (!patientId || !selectedBranch?.id) return;

      setLoadingPayments(true);
      try {
        // Fetch all payments for the branch and filter by patient
        const response = await api.get("/payments", {
          params: {
            branchId: selectedBranch.id,
            limit: 1000, // Get enough to filter client-side
          },
        });
        const allPayments = response.data?.data || response.data || [];

        // Filter payments for this patient
        const patientPayments = allPayments.filter(
          (payment) =>
            payment.appointment?.patientId === patientId ||
            payment.appointment?.patient?.id === patientId
        );

        // Sort by date (most recent first)
        patientPayments.sort((a, b) => {
          const dateA = new Date(a.paymentDate || a.appointment?.date || 0);
          const dateB = new Date(b.paymentDate || b.appointment?.date || 0);
          return dateB - dateA;
        });

        setPayments(patientPayments);
      } catch (err) {
        console.error("Error fetching patient payments:", err);
        setPayments([]);
      } finally {
        setLoadingPayments(false);
      }
    },
    [selectedBranch]
  );

  // Fetch history when patient changes
  useEffect(() => {
    if (isOpen && patient?.id) {
      fetchPatientHistory(patient.id);
      fetchPatientPayments(patient.id);
    } else {
      setPatientHistory(null);
      setPayments([]);
    }
  }, [isOpen, patient?.id, fetchPatientHistory, fetchPatientPayments]);

  // Listen for appointment and payment events to auto-refresh
  useEffect(() => {
    if (!isOpen || !patient?.id) return;

    const handleAppointmentCreated = () => {
      fetchPatientHistory(patient.id);
    };

    const handlePaymentUpdated = () => {
      fetchPatientPayments(patient.id);
    };

    window.addEventListener("appointment-created", handleAppointmentCreated);
    window.addEventListener("payment-updated", handlePaymentUpdated);
    window.addEventListener("payment-created", handlePaymentUpdated);

    return () => {
      window.removeEventListener(
        "appointment-created",
        handleAppointmentCreated
      );
      window.removeEventListener("payment-updated", handlePaymentUpdated);
      window.removeEventListener("payment-created", handlePaymentUpdated);
    };
  }, [isOpen, patient?.id, fetchPatientHistory, fetchPatientPayments]);

  // Close main modal
  const handleClose = () => {
    setPatientHistory(null);
    setPayments([]);
    onClose();
  };

  if (!patient) {
    return null;
  }

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={`Patient History: ${patient.name || ""}`}
        size="xl"
      >
        <div className="space-y-6">
          {/* Patient Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">
              Patient Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Name: </span>
                <span className="font-medium text-gray-900">
                  {patient.name}
                </span>
              </div>
              {patient.phone && (
                <div>
                  <span className="text-gray-600">Phone: </span>
                  <span className="font-medium text-gray-900">
                    {patient.phone}
                  </span>
                </div>
              )}
              {patient.email && (
                <div>
                  <span className="text-gray-600">Email: </span>
                  <span className="font-medium text-gray-900">
                    {patient.email}
                  </span>
                </div>
              )}
              {patient.dateOfBirth && (
                <div>
                  <span className="text-gray-600">Date of Birth: </span>
                  <span className="font-medium text-gray-900">
                    {formatDate(patient.dateOfBirth, "short")}
                  </span>
                </div>
              )}
              {patient.gender && (
                <div>
                  <span className="text-gray-600">Gender: </span>
                  <span className="font-medium text-gray-900">
                    {patient.gender}
                  </span>
                </div>
              )}
              {patient.cardNo && (
                <div>
                  <span className="text-gray-600">Card No: </span>
                  <span className="font-medium text-gray-900">
                    {patient.cardNo}
                  </span>
                </div>
              )}
              {patient.address && (
                <div className="sm:col-span-2">
                  <span className="text-gray-600">Address: </span>
                  <span className="font-medium text-gray-900">
                    {patient.address}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="py-12 text-center">
              <div className="inline-block w-8 h-8 border-b-2 border-indigo-600 rounded-full animate-spin"></div>
              <p className="mt-2 text-gray-500">Loading patient history...</p>
            </div>
          )}

          {/* Appointments History */}
          {!loading && patientHistory && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">
                Appointment History
              </h3>
              {patientHistory.appointments &&
              patientHistory.appointments.length > 0 ? (
                <div className="overflow-hidden bg-white rounded-lg shadow-md">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Date
                          </th>
                          <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Dentist
                          </th>
                          <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                            Visit Reason
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {patientHistory.appointments.map((appointment) => (
                          <tr key={appointment.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(appointment.date, "short")}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                              {appointment.dentist?.name || "N/A"}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  appointment.status === "COMPLETED"
                                    ? "bg-green-100 text-green-800"
                                    : appointment.status === "IN_PROGRESS"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }`}
                              >
                                {appointment.status || "PENDING"}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              {appointment.visitReason || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-white rounded-lg shadow-md">
                  <p className="py-8 text-center text-gray-500">
                    No appointment history available
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Payment History */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">
              Payment History
            </h3>
            {loadingPayments ? (
              <div className="py-8 text-center">
                <div className="inline-block w-6 h-6 border-b-2 border-indigo-600 rounded-full animate-spin"></div>
                <p className="mt-2 text-sm text-gray-500">
                  Loading payments...
                </p>
              </div>
            ) : payments.length > 0 ? (
              <div className="overflow-hidden bg-white rounded-lg shadow-md">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          Date
                        </th>
                        <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          Paid
                        </th>
                        <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          Status
                        </th>
                        <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                          Notes
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(
                              payment.paymentDate || payment.appointment?.date,
                              "short"
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(toNumber(payment.amount))}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(toNumber(payment.paidAmount))}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {(() => {
                              const statusConfig = formatPaymentStatus(
                                payment.paymentStatus
                              );
                              return (
                                <span
                                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusConfig.className}`}
                                >
                                  {statusConfig.label}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {payment.notes || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="p-6 bg-white rounded-lg shadow-md">
                <p className="py-8 text-center text-gray-500">
                  No payment history available
                </p>
              </div>
            )}
          </div>

          {/* Summary Statistics */}
          {!loading && patientHistory && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-600 font-medium">
                  Total Appointments
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {patientHistory.appointments?.length || 0}
                </div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-600 font-medium">
                  Total Payments
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {payments.length || 0}
                </div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-purple-600 font-medium">
                  Total Paid
                </div>
                <div className="text-2xl font-bold text-purple-900">
                  {formatCurrency(
                    payments.reduce((sum, p) => sum + toNumber(p.paidAmount), 0)
                  )}
                </div>
              </div>
            </div>
          )}

          {/* No History Message */}
          {!loading && !patientHistory && (
            <div className="text-center py-8 text-gray-500">
              No history available for this patient
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default PatientHistoryModal;
