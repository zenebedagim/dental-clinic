import { useState, useEffect } from "react";
import Modal from "../../common/Modal";
import api from "../../../services/api";
import useRoleAccess from "../../../hooks/useRoleAccess";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingPayment, setExistingPayment] = useState(null);

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
      setExistingPayment(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, appointment]);

  const fetchExistingPayment = async () => {
    if (!appointment?.id) return;
    try {
      const response = await api.get(`/payments/appointment/${appointment.id}`);
      const payment = response.data?.data || response.data;
      if (payment) {
        setExistingPayment(payment);
        setFormData({
          amount: payment.amount?.toString() || "",
          paidAmount: payment.paidAmount?.toString() || "0",
          paymentStatus: payment.paymentStatus || "UNPAID",
          paymentMethod: payment.paymentMethod || "",
          notes: payment.notes || "",
          isHidden: payment.isHidden || false,
        });
      }
    } catch (err) {
      // Payment doesn't exist yet, that's okay
      if (err.response?.status !== 404) {
        console.error("Error fetching payment:", err);
      }
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
      if (existingPayment) {
        // Update existing payment
        await api.put(`/payments/${existingPayment.id}`, {
          amount: formData.amount,
          paidAmount: formData.paidAmount || 0,
          paymentStatus: formData.paymentStatus,
          paymentMethod: formData.paymentMethod || null,
          notes: formData.notes || null,
          isHidden: formData.isHidden || false,
        });
      } else {
        // Create new payment
        await api.post("/payments", {
          appointmentId: appointment.id,
          amount: formData.amount,
          paidAmount: formData.paidAmount || 0,
          paymentStatus: formData.paymentStatus,
          paymentMethod: formData.paymentMethod || null,
          notes: formData.notes || null,
          isHidden: formData.isHidden || false,
        });
      }

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
  const remainingBalance =
    parseFloat(formData.amount || 0) - parseFloat(formData.paidAmount || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={existingPayment ? "Update Payment" : "Create Payment"}
      size="medium"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Patient Info */}
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm font-medium text-gray-700">
            Patient:{" "}
            <span className="font-semibold">{appointment.patientName}</span>
          </p>
          {treatmentCost && (
            <p className="text-sm text-gray-600 mt-1">
              Treatment Cost:{" "}
              <span className="font-semibold">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                }).format(treatmentCost)}
              </span>
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Amount */}
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

        {/* Paid Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Paid Amount *
          </label>
          <input
            type="number"
            name="paidAmount"
            value={formData.paidAmount}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            placeholder="0.00"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {remainingBalance > 0 && (
            <p className="text-xs text-yellow-600 mt-1">
              Remaining Balance:{" "}
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(remainingBalance)}
            </p>
          )}
          {remainingBalance <= 0 &&
            parseFloat(formData.paidAmount || 0) > 0 && (
              <p className="text-xs text-green-600 mt-1">✓ Fully Paid</p>
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
            Status is auto-determined based on paid amount, but can be manually
            adjusted
          </p>
        </div>

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
              Hidden payments are not visible by default but can be toggled to
              show
            </p>
          </div>
        )}

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
        {existingPayment && canViewDetailedBilling(existingPayment) && (
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
              {existingPayment.notes && (
                <div className="bg-white rounded p-3">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">
                    Additional Notes
                  </h4>
                  <p className="text-sm text-gray-600">
                    {existingPayment.notes}
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
              : existingPayment
              ? "Update Payment"
              : "Create Payment"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default PaymentModal;
