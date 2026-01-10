import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import { useToast } from "../../../hooks/useToast";

const DentistBillingPaymentView = () => {
  const { selectedBranch } = useBranch();
  const { success: showSuccess, error: showError } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    appointmentId: "",
    notes: "",
    isHidden: false, // false = Visible, true = Private
  });
  const [checkingExistingPayments, setCheckingExistingPayments] =
    useState(false);

  const fetchAppointments = useCallback(
    async (abortSignal) => {
      if (!selectedBranch?.id) {
        return;
      }

      try {
        setLoading(true);
        setError("");
        // Fetch appointments similar to PatientList's Search All Patients mode
        // Get appointments with treatments that have IN_PROGRESS or COMPLETED status
        const params = {
          branchId: selectedBranch.id,
          limit: 500,
        };
        const response = await api.get("/appointments/dentist", {
          params,
          signal: abortSignal,
        });
        const appointmentsData = response.data?.data || response.data || [];

        // Filter appointments to only show those with IN_PROGRESS or COMPLETED treatments
        // Use treatments array (preferred) or treatment object (backward compatibility)
        const filteredAppointments = appointmentsData.filter((apt) => {
          // Check treatments array first (preferred)
          if (apt.treatments && apt.treatments.length > 0) {
            // Check if any treatment has IN_PROGRESS or COMPLETED status
            return apt.treatments.some(
              (treatment) =>
                treatment.status === "IN_PROGRESS" ||
                treatment.status === "COMPLETED"
            );
          }
          // Fallback to treatment object (backward compatibility)
          if (apt.treatment) {
            return (
              apt.treatment.status === "IN_PROGRESS" ||
              apt.treatment.status === "COMPLETED"
            );
          }
          return false;
        });
        setAppointments(filteredAppointments);
      } catch (err) {
        // Ignore abort errors
        if (
          err.name === "AbortError" ||
          err.code === "ERR_CANCELED" ||
          err.message?.includes("canceled")
        ) {
          return;
        }
        const errorMsg =
          err.response?.data?.message || "Failed to fetch appointments";
        setError(errorMsg);
        console.error("Error fetching appointments:", err);
      } finally {
        setLoading(false);
      }
    },
    [selectedBranch]
  );

  useEffect(() => {
    if (!selectedBranch?.id) {
      return;
    }

    // Use AbortController for request cancellation
    const abortController = new AbortController();

    fetchAppointments(abortController.signal);

    // Cleanup function
    return () => {
      abortController.abort();
    };
  }, [selectedBranch, fetchAppointments]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-ET", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.appointmentId) {
      setError("Please select an appointment");
      showError("Please select an appointment");
      return;
    }

    if (!formData.notes || !formData.notes.trim()) {
      setError("Notes are required");
      showError("Notes are required");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Prepare payment data
      // Note: Backend needs to allow multiple payments per appointment
      // Currently, backend may have a unique constraint preventing duplicates
      const paymentNotes = formData.notes.trim();

      // Try to create payment - backend should allow multiple payments per appointment
      const paymentData = {
        appointmentId: formData.appointmentId,
        paymentStatus: "UNPAID",
        notes: paymentNotes,
        isHidden: formData.isHidden,
        // Include timestamp in notes to help distinguish payments if backend supports it
        // This is a workaround - backend should be updated to allow multiple payments
      };

      await api.post("/payments", paymentData);

      showSuccess(
        "Payment sent to reception successfully! You can add another payment for this appointment."
      );

      // Dispatch event to refresh reception payment list
      window.dispatchEvent(new CustomEvent("payment-created"));

      // Reset only notes, keep appointment selected and isHidden status
      // so subsequent payments match the first payment's visibility
      setFormData({
        ...formData,
        notes: "",
        // Keep isHidden status - don't reset it
      });
    } catch (err) {
      // Extract detailed error message
      let errorMsg = "Failed to create payment. Please try again.";

      if (err.response?.data) {
        // Check for validation errors
        if (
          err.response.data.errors &&
          Array.isArray(err.response.data.errors)
        ) {
          errorMsg = err.response.data.errors
            .map((e) => `${e.field || ""}: ${e.message}`)
            .join(", ");
        } else if (err.response.data.message) {
          errorMsg = err.response.data.message;
        } else if (typeof err.response.data === "string") {
          errorMsg = err.response.data;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }

      // If error mentions "already exists", provide helpful message
      if (
        errorMsg.toLowerCase().includes("already exists") ||
        errorMsg.toLowerCase().includes("duplicate") ||
        err.response?.status === 400
      ) {
        errorMsg =
          "A payment already exists for this appointment. The backend may need to be updated to allow multiple payments. Please contact the administrator or try a different appointment.";
      }

      console.error("Payment creation error:", {
        status: err.response?.status,
        data: err.response?.data,
        message: errorMsg,
      });

      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAppointment = appointments.find(
    (apt) => apt.id === formData.appointmentId
  );

  // Fetch existing payments for the selected appointment to detect visibility status
  useEffect(() => {
    const checkExistingPayments = async () => {
      if (!formData.appointmentId || !selectedBranch?.id) {
        return;
      }

      try {
        setCheckingExistingPayments(true);
        // Fetch payments for this appointment
        // Note: DENTIST role can now access /payments endpoint
        const response = await api.get("/payments", {
          params: {
            branchId: selectedBranch.id,
            appointmentId: formData.appointmentId,
            limit: 100, // Get all payments for this appointment
          },
        });
        const paymentsData = response.data?.data || response.data || [];

        if (Array.isArray(paymentsData) && paymentsData.length > 0) {
          // Get the oldest payment (first created) to match its visibility
          // Sort by createdAt to get the first payment ever created
          const sortedPayments = [...paymentsData].sort((a, b) => {
            const dateA = new Date(a.createdAt || a.paymentDate || 0);
            const dateB = new Date(b.createdAt || b.paymentDate || 0);
            return dateA - dateB; // Oldest first
          });
          const firstPayment = sortedPayments[0];
          const firstPaymentIsHidden = firstPayment.isHidden || false;

          // Automatically set isHidden to match the first payment
          setFormData((prev) => ({
            ...prev,
            isHidden: firstPaymentIsHidden,
          }));
        } else {
          // No existing payments, keep current value (don't reset)
          // This allows user to set it manually for the first payment
        }
      } catch (err) {
        // If error, keep current value (don't change)
        console.error("Error checking existing payments:", err);
      } finally {
        setCheckingExistingPayments(false);
      }
    };

    checkExistingPayments();
  }, [formData.appointmentId, selectedBranch]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Billing Payment
        </h1>
        <p className="mt-2 text-sm text-gray-600 sm:text-base">
          Create billing payment records and send them to reception. You can
          create multiple payments (10+) for the same patient/appointment.
          {selectedBranch && ` - ${selectedBranch.name}`}
        </p>
      </div>

      {!selectedBranch ? (
        <div className="px-4 py-3 text-yellow-700 bg-yellow-100 border border-yellow-400 rounded">
          Please select a branch to create billing payments.
        </div>
      ) : (
        <div className="p-6 bg-white rounded-lg shadow-md">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="px-4 py-3 text-red-700 bg-red-100 border border-red-400 rounded">
                {error}
              </div>
            )}

            {/* Appointment Selector */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Select Appointment
              </label>
              {loading ? (
                <div className="py-4 text-center">
                  <div className="inline-block w-6 h-6 border-b-2 border-indigo-600 rounded-full animate-spin"></div>
                  <p className="mt-2 text-sm text-gray-500">
                    Loading appointments...
                  </p>
                </div>
              ) : appointments.length === 0 ? (
                <div className="p-4 text-center rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-500">
                    No appointments found.
                  </p>
                </div>
              ) : (
                <select
                  value={formData.appointmentId}
                  onChange={(e) =>
                    setFormData({ ...formData, appointmentId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="">Select an appointment...</option>
                  {appointments.map((apt) => {
                    // Get the latest treatment status (from treatments array or treatment object)
                    const latestTreatment =
                      apt.treatments && apt.treatments.length > 0
                        ? apt.treatments[0] // Most recent treatment (already sorted by createdAt desc)
                        : apt.treatment;
                    const treatmentStatus = latestTreatment?.status || "";

                    return (
                      <option key={apt.id} value={apt.id}>
                        {apt.patientName || "Unknown"} - {formatDate(apt.date)}
                        {treatmentStatus && ` [${treatmentStatus}]`}
                      </option>
                    );
                  })}
                </select>
              )}
              {selectedAppointment && (
                <div className="p-3 mt-2 rounded-md bg-gray-50">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Patient:</span>{" "}
                    {selectedAppointment.patientName}
                  </p>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Date:</span>{" "}
                    {formatDate(selectedAppointment.date)}
                  </p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Payment Notes <span className="text-red-500">*</span>
                <span className="ml-2 text-xs font-normal text-gray-500">
                  (Each payment can have different notes)
                </span>
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Add payment notes for reception (e.g., 'First payment', 'Partial payment', 'Additional procedure payment', etc.)..."
                required
              />
            </div>

            {/* Visibility Option */}
            <div className="flex items-center justify-end">
              <input
                type="checkbox"
                id="isPrivate"
                checked={formData.isHidden}
                onChange={(e) =>
                  setFormData({ ...formData, isHidden: e.target.checked })
                }
                disabled={checkingExistingPayments}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 disabled:opacity-50"
                title=""
              />
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
              {formData.appointmentId && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData({
                      appointmentId: "",
                      notes: "",
                      isHidden: false,
                    });
                    setError("");
                  }}
                  className="px-4 py-3 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 font-medium min-h-[44px]"
                >
                  Clear Selection
                </button>
              )}
              <button
                type="submit"
                disabled={
                  submitting ||
                  !formData.appointmentId ||
                  !formData.notes?.trim() ||
                  loading
                }
                className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold min-h-[44px]"
              >
                {submitting ? "Sending..." : "Send Payment to Reception"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DentistBillingPaymentView;
