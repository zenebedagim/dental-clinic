import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import { useToast } from "../../../hooks/useToast";
import { XRAY_TYPES, XRAY_CATEGORIES } from "../../../utils/dentalConstants";
import Modal from "../../common/Modal";

const XrayRequestForm = ({ onRequestCreated }) => {
  const { selectedBranch } = useBranch();
  const { success: showSuccess, error: showError } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [xrayDoctors, setXrayDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [formData, setFormData] = useState({
    appointmentId: "",
    xrayDoctorId: "",
    xrayType: "",
    xrayTypeOther: "",
    notes: "",
    urgency: "NORMAL",
  });
  const [showOtherInput, setShowOtherInput] = useState(false);

  const fetchAppointments = useCallback(async () => {
    if (!selectedBranch?.id) return;
    try {
      setLoadingAppointments(true);
      const response = await api.get("/appointments/dentist", {
        params: { branchId: selectedBranch.id },
      });
      const data = response.data?.data || response.data || [];
      setAppointments(data);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      showError("Failed to load appointments");
    } finally {
      setLoadingAppointments(false);
    }
  }, [selectedBranch, showError]);

  const fetchXrayDoctors = useCallback(async () => {
    if (!selectedBranch?.id) return;
    try {
      const response = await api.get("/users", {
        params: { branchId: selectedBranch.id, role: "XRAY" },
      });
      const data = response.data?.data || response.data || [];
      setXrayDoctors(data);
    } catch (err) {
      console.error("Error fetching X-Ray doctors:", err);
      showError("Failed to load X-Ray doctors");
    }
  }, [selectedBranch, showError]);

  useEffect(() => {
    if (isOpen && selectedBranch?.id) {
      fetchAppointments();
      fetchXrayDoctors();
    }
  }, [isOpen, selectedBranch, fetchAppointments, fetchXrayDoctors]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "xrayType") {
      if (value === "OTHER") {
        setShowOtherInput(true);
        setFormData((prev) => ({ ...prev, [name]: "", xrayTypeOther: "" }));
      } else {
        setShowOtherInput(false);
        setFormData((prev) => ({ ...prev, [name]: value, xrayTypeOther: "" }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !formData.appointmentId ||
      !formData.xrayDoctorId ||
      (!formData.xrayType && !formData.xrayTypeOther.trim())
    ) {
      showError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      // Determine the actual X-ray type to save
      const xrayTypeValue = formData.xrayTypeOther.trim()
        ? formData.xrayTypeOther.trim()
        : formData.xrayType;

      // Get the display name for the selected type (if not "Other")
      let xrayTypeDisplay = xrayTypeValue;
      if (!formData.xrayTypeOther.trim()) {
        const selectedType = XRAY_TYPES.find((t) => t.value === xrayTypeValue);
        if (selectedType) {
          xrayTypeDisplay = selectedType.abbreviation
            ? `[${selectedType.abbreviation}] ${selectedType.name}`
            : selectedType.name;
        }
      }

      // Combine notes with X-ray type information
      const notesWithType = formData.notes
        ? `${formData.notes}\n\nInvestigation/X-Ray Type: ${xrayTypeDisplay}`
        : `Investigation/X-Ray Type: ${xrayTypeDisplay}`;

      // Create X-Ray request by updating the appointment with xrayId
      // Include xrayType in notes for documentation
      await api.put(`/appointments/${formData.appointmentId}`, {
        xrayId: formData.xrayDoctorId,
        notes: notesWithType,
      });

      showSuccess("X-Ray request created successfully!");
      setIsOpen(false);
      setFormData({
        appointmentId: "",
        xrayDoctorId: "",
        xrayType: "",
        xrayTypeOther: "",
        notes: "",
        urgency: "NORMAL",
      });
      setShowOtherInput(false);
      if (onRequestCreated) {
        onRequestCreated();
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to create X-Ray request";
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (!selectedBranch) {
    return (
      <div className="px-4 py-3 text-yellow-700 bg-yellow-100 border border-yellow-400 rounded">
        Please select a branch to create X-Ray requests.
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-indigo-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium min-h-[44px]"
      >
        + Request New X-Ray
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
          setFormData({
            appointmentId: "",
            xrayDoctorId: "",
            xrayType: "",
            xrayTypeOther: "",
            notes: "",
            urgency: "NORMAL",
          });
          setShowOtherInput(false);
        }}
        title="Create X-Ray Request"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Appointment/Patient Selection */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Patient/Appointment *
            </label>
            {loadingAppointments ? (
              <div className="text-sm text-gray-500">
                Loading appointments...
              </div>
            ) : (
              <select
                name="appointmentId"
                value={formData.appointmentId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Patient/Appointment</option>
                {appointments.map((appointment) => (
                  <option key={appointment.id} value={appointment.id}>
                    {appointment.patientName} - {formatDate(appointment.date)}
                  </option>
                ))}
              </select>
            )}
            {appointments.length === 0 && !loadingAppointments && (
              <p className="mt-1 text-xs text-gray-500">
                No appointments found. Create an appointment first.
              </p>
            )}
          </div>

          {/* X-Ray Doctor Selection */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              X-Ray Doctor *
            </label>
            <select
              name="xrayDoctorId"
              value={formData.xrayDoctorId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select X-Ray Doctor</option>
              {xrayDoctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </select>
            {xrayDoctors.length === 0 && (
              <p className="mt-1 text-xs text-yellow-600">
                No X-Ray doctors available in this branch.
              </p>
            )}
          </div>

          {/* X-Ray Type / Investigation */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Investigation / X-Ray Type *
            </label>
            <select
              name="xrayType"
              value={formData.xrayType}
              onChange={handleChange}
              required={!showOtherInput}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Investigation / X-Ray Type</option>
              {XRAY_CATEGORIES.map((category) => {
                const typesInCategory = XRAY_TYPES.filter(
                  (t) => t.category === category
                );
                if (typesInCategory.length === 0) return null;
                return (
                  <optgroup key={category} label={category}>
                    {typesInCategory.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.abbreviation
                          ? `[${type.abbreviation}] ${type.name}`
                          : type.name}
                        {type.description
                          ? ` - ${type.description}`
                          : ""}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
              <option value="OTHER">Other (Custom)</option>
            </select>

            {/* Other (Custom) Text Input */}
            {showOtherInput && (
              <div className="mt-2">
                <input
                  type="text"
                  name="xrayTypeOther"
                  value={formData.xrayTypeOther}
                  onChange={handleChange}
                  required={showOtherInput}
                  placeholder="Enter custom investigation / X-ray type..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter any custom investigation or X-ray type not listed above
                </p>
              </div>
            )}
          </div>

          {/* Urgency */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Urgency
            </label>
            <select
              name="urgency"
              value={formData.urgency}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="NORMAL">Normal</option>
              <option value="URGENT">Urgent</option>
              <option value="STAT">STAT (Immediate)</option>
            </select>
          </div>

          {/* Notes/Instructions */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Notes/Instructions (Optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Add any specific instructions or notes for the X-Ray doctor..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end pt-4 space-x-3">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                loading ||
                !formData.appointmentId ||
                !formData.xrayDoctorId ||
                (!formData.xrayType && !formData.xrayTypeOther.trim())
              }
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Request"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default XrayRequestForm;
