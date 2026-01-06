import { useState, useEffect } from "react";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import { useToast } from "../../../hooks/useToast";
import Modal from "../../common/Modal";

const AppointmentRescheduleModal = ({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}) => {
  const { selectedBranch } = useBranch();
  const { success: showSuccess, error: showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    reason: "",
  });
  const [dentists, setDentists] = useState([]);
  const [availabilityCheck, setAvailabilityCheck] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    if (isOpen && appointment) {
      // Pre-fill form with current appointment data
      const appointmentDate = new Date(appointment.date);
      setFormData({
        date: appointmentDate.toISOString().split("T")[0],
        time: appointmentDate.toTimeString().slice(0, 5),
        reason: appointment.visitReason || "",
      });

      // Fetch dentists for the branch
      fetchDentists();
    }
  }, [isOpen, appointment]);

  const fetchDentists = async () => {
    try {
      const response = await api.get("/users", {
        params: { role: "DENTIST" },
      });
      const dentistsData = response.data?.data || response.data || [];
      setDentists(dentistsData);
    } catch (err) {
      console.error("Error fetching dentists:", err);
    }
  };

  const checkAvailability = async () => {
    if (!formData.date || !formData.time || !appointment?.dentistId) {
      return;
    }

    try {
      setCheckingAvailability(true);
      const appointmentDateTime = `${formData.date}T${formData.time}`;
      const response = await api.get("/schedules/check", {
        params: {
          doctorId: appointment.dentistId,
          branchId: selectedBranch?.id,
          date: formData.date,
          startTime: formData.time,
        },
      });
      const availabilityData = response.data?.data || response.data;
      setAvailabilityCheck(availabilityData);
    } catch (err) {
      console.error("Error checking availability:", err);
      setAvailabilityCheck(null);
    } finally {
      setCheckingAvailability(false);
    }
  };

  useEffect(() => {
    if (formData.date && formData.time) {
      const timeoutId = setTimeout(() => {
        checkAvailability();
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.date, formData.time]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!appointment) return;

    if (!formData.date || !formData.time) {
      showError("Please select date and time");
      return;
    }

    if (!availabilityCheck?.isAvailable) {
      showError("Selected time slot is not available");
      return;
    }

    try {
      setLoading(true);
      // Send date and time as separate fields as expected by the server
      await api.post(`/appointments/${appointment.id}/reschedule`, {
        date: formData.date,
        time: formData.time,
        reason: formData.reason,
      });

      showSuccess("Appointment rescheduled successfully");
      window.dispatchEvent(new CustomEvent("appointment-created"));
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showError(
        err.response?.data?.message || "Failed to reschedule appointment"
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !appointment) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reschedule Appointment">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Patient
          </label>
          <input
            type="text"
            value={appointment.patientName || "N/A"}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dentist
          </label>
          <input
            type="text"
            value={appointment.dentist?.name || "N/A"}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Date *
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, date: e.target.value }))
            }
            min={new Date().toISOString().split("T")[0]}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Time *
          </label>
          <input
            type="time"
            value={formData.time}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, time: e.target.value }))
            }
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {checkingAvailability && (
          <p className="text-sm text-gray-600">Checking availability...</p>
        )}

        {availabilityCheck && !checkingAvailability && (
          <div
            className={`p-3 rounded-md ${
              availabilityCheck.isAvailable
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {availabilityCheck.isAvailable
              ? "✓ Time slot is available"
              : "✗ Time slot is not available"}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reason (Optional)
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, reason: e.target.value }))
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Reason for rescheduling..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !availabilityCheck?.isAvailable}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Rescheduling..." : "Reschedule"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AppointmentRescheduleModal;
