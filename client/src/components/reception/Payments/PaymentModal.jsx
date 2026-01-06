import { useState, useEffect } from "react";
import Modal from "../../common/Modal";
import api from "../../../services/api";
import useRoleAccess from "../../../hooks/useRoleAccess";
import {
  formatCurrency,
  toNumber,
  formatPaymentStatus,
} from "../shared/PaymentFormatter";

const PaymentModal = ({ isOpen, onClose, appointment, onPaymentSaved }) => {
  const { canViewDetailedBilling, isRole } = useRoleAccess();
  const isReception = isRole("RECEPTION");
  const [formData, setFormData] = useState({
    amount: "",
    paidAmount: "",
    paymentStatus: "UNPAID",
    paymentMethod: "",
    notes: "",
    isHidden: false,
  });
  const [additionalPayment, setAdditionalPayment] = useState("");
  const [additionalPaymentMethod, setAdditionalPaymentMethod] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingPayments, setExistingPayments] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editFormData, setEditFormData] = useState({
    paidAmount: "",
    paymentMethod: "",
    paymentStatus: "",
    notes: "",
  });

  useEffect(() => {
    if (isOpen && appointment?.id) {
      fetchExistingPayment();
      // Set default amount from treatment if available
      const treatmentCost = appointment.treatment?.totalCost;
      if (treatmentCost) {
        setFormData((prev) => ({
          ...prev,
          amount: treatmentCost.toString(),
        }));
      }
    } else if (!isOpen) {
      // Reset form when modal closes
      setFormData({
        amount: "",
        paidAmount: "",
        paymentStatus: "UNPAID",
        paymentMethod: "",
        notes: "",
        isHidden: false,
      });
      setError("");
      setExistingPayments([]);
      setAdditionalPayment("");
      setAdditionalPaymentMethod("");
      setPaymentHistory([]);
      setEditingPayment(null);
      setEditFormData({
        paidAmount: "",
        paymentMethod: "",
        paymentStatus: "",
        notes: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, appointment]);

  const fetchExistingPayment = async () => {
    if (!appointment?.id) return;
    try {
      const response = await api.get(`/payments/appointment/${appointment.id}`);
      // Backend now returns an array of payments
      const payments = Array.isArray(response.data?.data)
        ? response.data.data
        : Array.isArray(response.data)
        ? response.data
        : response.data?.data
        ? [response.data.data]
        : [];

      if (payments.length > 0) {
        setExistingPayments(payments);

        // Sort payments by creation date (oldest first)
        const sortedPayments = [...payments].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );

        // Use the first payment for form defaults (total amount)
        const firstPayment = sortedPayments[0];
        setFormData({
          amount: firstPayment.amount?.toString() || "",
          paidAmount: "", // Will be calculated from all payments
          paymentStatus: firstPayment.paymentStatus || "UNPAID",
          paymentMethod: firstPayment.paymentMethod || "",
          notes: "", // Clear notes for new payment
          isHidden: false,
        });

        // Build payment history table from all payments
        const history = sortedPayments.map((payment, index) => ({
          id: payment.id,
          number: index + 1,
          date: payment.createdAt || payment.paymentDate,
          amount: toNumber(payment.amount),
          paidAmount: toNumber(payment.paidAmount),
          paymentStatus: payment.paymentStatus,
          paymentMethod: payment.paymentMethod || "N/A",
          notes: payment.notes || "",
          isHidden: payment.isHidden || false,
        }));

        setPaymentHistory(history);

        // Calculate total paid amount from all payments
        const totalPaid = history.reduce(
          (sum, p) => sum + toNumber(p.paidAmount),
          0
        );
        const totalAmount = toNumber(firstPayment.amount);

        // Update form with calculated totals
        setFormData((prev) => ({
          ...prev,
          paidAmount: totalPaid.toString(),
          paymentStatus:
            totalPaid === 0
              ? "UNPAID"
              : totalPaid >= totalAmount
              ? "PAID"
              : "PARTIAL",
        }));
      } else {
        // No payments yet - reset to defaults
        setExistingPayments([]);
        setPaymentHistory([]);
        const treatmentCost = appointment.treatment?.totalCost;
        setFormData({
          amount: treatmentCost ? treatmentCost.toString() : "",
          paidAmount: "",
          paymentStatus: "UNPAID",
          paymentMethod: "",
          notes: "",
          isHidden: false,
        });
      }
    } catch (err) {
      // Payment doesn't exist yet, that's okay
      if (err.response?.status !== 404) {
        console.error("Error fetching payments:", err);
      }
      setExistingPayments([]);
      setPaymentHistory([]);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Auto-determine payment status based on paidAmount and amount
      if (name === "paidAmount" || name === "amount") {
        const paid = parseFloat(updated.paidAmount || 0);
        const total = parseFloat(updated.amount || 0);

        if (paid === 0) {
          updated.paymentStatus = "UNPAID";
        } else if (paid >= total) {
          updated.paymentStatus = "PAID";
        } else {
          updated.paymentStatus = "PARTIAL";
        }
      }

      return updated;
    });
  };

  const handleAddPayment = async () => {
    const addAmount = parseFloat(additionalPayment || 0);
    if (isNaN(addAmount) || addAmount <= 0) {
      setError("Please enter a valid payment amount");
      return;
    }

    const totalAmount = parseFloat(formData.amount || 0);
    const currentTotalPaid = paymentHistory.reduce(
      (sum, p) => sum + toNumber(p.paidAmount),
      0
    );
    const newTotalPaid = currentTotalPaid + addAmount;

    if (newTotalPaid > totalAmount) {
      setError("Total paid amount cannot exceed total amount");
      return;
    }

    // Create a new payment record
    setLoading(true);
    setError("");

    try {
      await api.post("/payments", {
        appointmentId: appointment.id,
        amount: totalAmount, // Total amount for the appointment
        paidAmount: addAmount, // This payment's contribution
        paymentStatus: newTotalPaid >= totalAmount ? "PAID" : "PARTIAL",
        paymentMethod:
          additionalPaymentMethod || formData.paymentMethod || null,
        notes: `Partial payment #${paymentHistory.length + 1}`,
        isHidden: formData.isHidden || false,
      });

      // Refresh payment list
      await fetchExistingPayment();

      // Clear additional payment fields
      setAdditionalPayment("");
      setAdditionalPaymentMethod("");

      // Dispatch event to refresh payment lists
      window.dispatchEvent(new CustomEvent("payment-updated"));

      if (onPaymentSaved) {
        onPaymentSaved();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add payment");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!appointment?.id) return;

    const amount = parseFloat(formData.amount);
    const paidAmount = parseFloat(formData.paidAmount || 0);

    if (isNaN(amount) || amount <= 0) {
      setError("Amount must be a positive number");
      return;
    }

    if (paidAmount > amount) {
      setError("Paid amount cannot exceed total amount");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Always create a new payment (supporting multiple payments)
      await api.post("/payments", {
        appointmentId: appointment.id,
        amount: formData.amount,
        paidAmount: formData.paidAmount || 0,
        paymentStatus: formData.paymentStatus,
        paymentMethod: formData.paymentMethod || null,
        notes: formData.notes || null,
        isHidden: formData.isHidden || false,
      });

      // Dispatch event to refresh patient history and payment lists
      window.dispatchEvent(new CustomEvent("payment-updated"));

      if (onPaymentSaved) {
        onPaymentSaved();
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save payment");
    } finally {
      setLoading(false);
    }
  };

  if (!appointment) return null;

  const treatmentCost = appointment.treatment?.totalCost;
  const totalPaidAmount = paymentHistory.reduce(
    (sum, p) => sum + toNumber(p.paidAmount),
    0
  );
  const totalAmount = parseFloat(formData.amount || 0);
  const remainingBalance = totalAmount - totalPaidAmount;

  // Use larger size to show all content properly
  const modalSize = "xl";

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        existingPayments.length > 0
          ? "Payment History & Add Payment"
          : "Create Payment"
      }
      size={modalSize}
    >
      <form
        onSubmit={handleSubmit}
        className="space-y-4 max-h-[85vh] overflow-y-auto pr-2"
      >
        {/* Patient Info */}
        <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-medium text-gray-600">Patient</p>
              <p className="text-base font-semibold text-gray-900">
                {appointment.patientName}
              </p>
            </div>
            {treatmentCost && (
              <div>
                <p className="text-xs font-medium text-gray-600">
                  Treatment Cost
                </p>
                <p className="text-base font-semibold text-indigo-600">
                  {formatCurrency(treatmentCost)}
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Payment Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Amount *
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {treatmentCost && (
              <p className="text-xs text-gray-500 mt-1">
                Suggested:{" "}
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(treatmentCost)}
              </p>
            )}
          </div>

          {/* Payment Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status
            </label>
            <select
              name="paymentStatus"
              value={formData.paymentStatus}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partial</option>
              <option value="PAID">Paid</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Auto-determined based on paid amount
            </p>
          </div>
        </div>

        {/* Paid Amount Section */}
        {existingPayments.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paid Amount *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                name="paidAmount"
                value={formData.paidAmount}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
              <span className="text-lg font-bold text-gray-700">
                {formatCurrency(parseFloat(formData.paidAmount || 0))}
              </span>
            </div>
            {remainingBalance > 0 && (
              <p className="text-sm text-yellow-700 mt-2 font-medium">
                Remaining Balance: {formatCurrency(remainingBalance)}
              </p>
            )}
            {remainingBalance <= 0 &&
              parseFloat(formData.paidAmount || 0) > 0 && (
                <p className="text-sm text-green-700 mt-2 font-medium">
                  ✓ Fully Paid
                </p>
              )}
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Summary
            </label>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Amount:</span>
                <span className="text-base font-semibold text-gray-900">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Paid:</span>
                <span className="text-base font-bold text-green-600">
                  {formatCurrency(totalPaidAmount)}
                </span>
              </div>
              {remainingBalance > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                  <span className="text-sm font-medium text-yellow-700">
                    Remaining Balance:
                  </span>
                  <span className="text-base font-bold text-yellow-700">
                    {formatCurrency(remainingBalance)}
                  </span>
                </div>
              )}
              {remainingBalance <= 0 && totalPaidAmount > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                  <span className="text-sm font-medium text-green-700">
                    Status:
                  </span>
                  <span className="text-base font-bold text-green-700">
                    ✓ Fully Paid
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment History Table */}
        {paymentHistory.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                Payment History ({paymentHistory.length} payment
                {paymentHistory.length !== 1 ? "s" : ""})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount Paid
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paymentHistory.map((payment) => {
                    const statusConfig = formatPaymentStatus(
                      payment.paymentStatus
                    );
                    const isEditing = editingPayment?.id === payment.id;

                    if (isEditing) {
                      return (
                        <tr key={payment.id} className="bg-yellow-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 font-semibold text-sm">
                              {payment.number}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {formatDate(payment.date)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <input
                              type="number"
                              value={editFormData.paidAmount}
                              onChange={(e) =>
                                setEditFormData((prev) => ({
                                  ...prev,
                                  paidAmount: e.target.value,
                                }))
                              }
                              min="0"
                              step="0.01"
                              className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select
                              value={editFormData.paymentMethod}
                              onChange={(e) =>
                                setEditFormData((prev) => ({
                                  ...prev,
                                  paymentMethod: e.target.value,
                                }))
                              }
                              className="w-32 px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="">Select...</option>
                              <option value="CASH">Cash</option>
                              <option value="CARD">Card</option>
                              <option value="MOBILE">Mobile Payment</option>
                              <option value="BANK_TRANSFER">
                                Bank Transfer
                              </option>
                              <option value="CHECK">Check</option>
                              <option value="OTHER">Other</option>
                            </select>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <select
                              value={editFormData.paymentStatus}
                              onChange={(e) =>
                                setEditFormData((prev) => ({
                                  ...prev,
                                  paymentStatus: e.target.value,
                                }))
                              }
                              className="w-28 px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="UNPAID">Unpaid</option>
                              <option value="PARTIAL">Partial</option>
                              <option value="PAID">Paid</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editFormData.notes}
                              onChange={(e) =>
                                setEditFormData((prev) => ({
                                  ...prev,
                                  notes: e.target.value,
                                }))
                              }
                              placeholder="Notes..."
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  try {
                                    setLoading(true);
                                    const totalAmount = parseFloat(
                                      formData.amount || 0
                                    );

                                    await api.put(`/payments/${payment.id}`, {
                                      amount: totalAmount,
                                      paidAmount: editFormData.paidAmount || 0,
                                      paymentStatus:
                                        editFormData.paymentStatus ||
                                        payment.paymentStatus,
                                      paymentMethod:
                                        editFormData.paymentMethod ||
                                        payment.paymentMethod ||
                                        null,
                                      notes: editFormData.notes || null,
                                      isHidden: payment.isHidden || false,
                                    });

                                    await fetchExistingPayment();
                                    setEditingPayment(null);
                                    window.dispatchEvent(
                                      new CustomEvent("payment-updated")
                                    );
                                    if (onPaymentSaved) {
                                      onPaymentSaved();
                                    }
                                  } catch (err) {
                                    setError(
                                      err.response?.data?.message ||
                                        "Failed to update payment"
                                    );
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                                disabled={loading}
                                className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => {
                                  setEditingPayment(null);
                                  setEditFormData({
                                    paidAmount: "",
                                    paymentMethod: "",
                                    paymentStatus: "",
                                    notes: "",
                                  });
                                }}
                                className="px-2 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-800 font-semibold text-sm">
                            {payment.number}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(payment.date)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600">
                          {formatCurrency(payment.paidAmount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          {payment.paymentMethod}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusConfig.className}`}
                          >
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {payment.notes || "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setEditingPayment(payment);
                                setEditFormData({
                                  paidAmount:
                                    payment.paidAmount?.toString() || "",
                                  paymentMethod: payment.paymentMethod || "",
                                  paymentStatus:
                                    payment.paymentStatus || "UNPAID",
                                  notes: payment.notes || "",
                                });
                              }}
                              className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
                              title="Edit payment"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    "Are you sure you want to delete this payment?"
                                  )
                                ) {
                                  return;
                                }
                                try {
                                  setLoading(true);
                                  await api.delete(`/payments/${payment.id}`);
                                  await fetchExistingPayment();
                                  window.dispatchEvent(
                                    new CustomEvent("payment-updated")
                                  );
                                  if (onPaymentSaved) {
                                    onPaymentSaved();
                                  }
                                } catch (err) {
                                  setError(
                                    err.response?.data?.message ||
                                      "Failed to delete payment"
                                  );
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              disabled={loading}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                              title="Delete payment"
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Total Row */}
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={2} className="px-4 py-3 text-sm text-gray-900">
                      Total Paid:
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-green-700">
                      {formatCurrency(totalPaidAmount)}
                    </td>
                    <td colSpan={3} className="px-4 py-3 text-sm text-gray-600">
                      {remainingBalance > 0 ? (
                        <span className="text-yellow-700">
                          Remaining: {formatCurrency(remainingBalance)}
                        </span>
                      ) : (
                        <span className="text-green-700">✓ Fully Paid</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Additional Payment Section */}
        {existingPayments.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Add Additional Payment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Payment Amount
                </label>
                <input
                  type="number"
                  value={additionalPayment}
                  onChange={(e) => setAdditionalPayment(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Payment Method
                </label>
                <select
                  value={additionalPaymentMethod}
                  onChange={(e) => setAdditionalPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  <option value="">Same as above</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="MOBILE">Mobile Payment</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHECK">Check</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddPayment}
              disabled={
                !additionalPayment || parseFloat(additionalPayment || 0) <= 0
              }
              className="mt-3 w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Add Payment
            </button>
          </div>
        )}

        {/* Payment Method & Hidden Payment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select method...</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="MOBILE">Mobile Payment</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CHECK">Check</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          {/* Hidden Payment - Only for Reception */}
          {isReception && (
            <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isHidden"
                  checked={formData.isHidden}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      isHidden: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Hidden Payment
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Hidden payments are not visible by default
              </p>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Additional payment notes..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Detailed Billing Section - Only visible when enabled by dentist */}
        {existingPayments.length > 0 &&
          canViewDetailedBilling(existingPayments[0]) && (
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Detailed Billing Information
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 space-y-3">
                {/* Service Breakdown */}
                {appointment.treatment && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      Service Breakdown
                    </h4>
                    <div className="bg-white rounded p-3">
                      {appointment.treatment.procedureLogs &&
                      Array.isArray(appointment.treatment.procedureLogs) ? (
                        <ul className="space-y-2">
                          {appointment.treatment.procedureLogs.map(
                            (procedure, idx) => (
                              <li
                                key={idx}
                                className="text-sm text-gray-600 flex justify-between"
                              >
                                <span>
                                  {procedure.description ||
                                    procedure.code ||
                                    "Procedure"}
                                  {procedure.tooth &&
                                    ` - Tooth ${procedure.tooth}`}
                                </span>
                                {procedure.cost && (
                                  <span className="font-medium">
                                    {new Intl.NumberFormat("en-US", {
                                      style: "currency",
                                      currency: "USD",
                                    }).format(procedure.cost)}
                                  </span>
                                )}
                              </li>
                            )
                          )}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Treatment completed - see treatment notes for details
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Costs Linked to Services */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded p-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">
                      Dentist Services
                    </h4>
                    <p className="text-lg font-bold text-indigo-600">
                      {appointment.treatment?.totalCost
                        ? new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(appointment.treatment.totalCost)
                        : "N/A"}
                    </p>
                  </div>
                  {appointment.xrayResult && (
                    <div className="bg-white rounded p-3">
                      <h4 className="text-sm font-semibold text-gray-700 mb-1">
                        X-Ray Services
                      </h4>
                      <p className="text-lg font-bold text-indigo-600">
                        {appointment.xrayResult.xrayType || "X-Ray Completed"}
                      </p>
                    </div>
                  )}
                </div>

                {/* Tax & Insurance Eligibility */}
                <div className="bg-white rounded p-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                    Tax & Insurance Information
                  </h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>
                      <span className="font-medium">Tax Eligible:</span> Yes
                    </p>
                    <p>
                      <span className="font-medium">Insurance Eligible:</span>{" "}
                      {appointment.patient?.insuranceInfo || "Not specified"}
                    </p>
                  </div>
                </div>

                {/* Additional Billing Details */}
                {existingPayments[0]?.notes && (
                  <div className="bg-white rounded p-3">
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">
                      Additional Notes
                    </h4>
                    <p className="text-sm text-gray-600">
                      {existingPayments[0].notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? "Saving..."
              : existingPayments.length > 0
              ? "Add New Payment"
              : "Create Payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PaymentModal;
