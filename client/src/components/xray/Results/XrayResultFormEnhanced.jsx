import { useState, useEffect } from "react";
import api from "../../../services/api";
import { useToast } from "../../../hooks/useToast";
import XrayImageViewer from "../../common/XrayImageViewer";
import XrayShareModal from "./XrayShareModal";
import { XRAY_TYPES } from "../../../utils/dentalConstants";

const XrayResultFormEnhanced = ({ appointment, onResultSaved }) => {
  const { success: showSuccess, error: showError } = useToast();
  const [formData, setFormData] = useState({
    result: "",
    images: [],
  });
  const [imagePreviews, setImagePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [xrayResult, setXrayResult] = useState(null);
  const [refreshImages, setRefreshImages] = useState(0);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  useEffect(() => {
    if (appointment?.xrayResult) {
      const xray = appointment.xrayResult;
      setXrayResult(xray);

      setFormData({
        result: xray.result || "",
        images: [],
      });
      setImagePreviews([]);
      setRefreshImages((prev) => prev + 1);
    } else {
      setXrayResult(null);
      setFormData({
        result: "",
        images: [],
      });
      setImagePreviews([]);
      setRefreshImages(0);
    }
  }, [appointment]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setFormData({
        ...formData,
        images: [...formData.images, ...files].slice(0, 10), // Limit to 10 images
      });

      // Create previews for new files
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews((prev) => [...prev, reader.result]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    });
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Require at least one image to submit
    if (formData.images.length === 0) {
      setError("Please upload at least one X-Ray image");
      showError("Please upload at least one X-Ray image");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const submitData = new FormData();
      // Make appointmentId optional - only include if appointment exists
      if (appointment?.id) {
        submitData.append("appointmentId", appointment.id);
      }
      // Only append xrayType if it has a valid value (not empty string)
      if (appointment?.xrayType) {
        submitData.append("xrayType", appointment.xrayType);
      }
      // Only append result if it has a value
      if (formData.result && formData.result.trim()) {
        submitData.append("result", formData.result.trim());
      }

      // Append multiple images
      formData.images.forEach((image) => {
        submitData.append("images", image);
      });

      const response = await api.post("/xray", submitData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      // Clear image form data after successful upload
      setFormData((prev) => ({ ...prev, images: [] }));
      setImagePreviews([]);
      const xrayData = response.data?.data || response.data;
      if (xrayData?.id) {
        setXrayResult(xrayData);
        setRefreshImages((prev) => prev + 1);
      }

      setSuccess("X-Ray result saved successfully!");
      showSuccess("X-Ray result saved successfully!");
      if (onResultSaved) {
        onResultSaved();
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to save X-Ray result";
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendToDentist = async () => {
    if (!xrayResult) {
      showError("X-Ray result is required");
      return;
    }

    if (!appointment) {
      showError("Appointment information is required to send to dentist");
      return;
    }

    if (!appointment.dentistId) {
      showError("No dentist assigned to this appointment");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      await api.put(`/xray/${xrayResult.id}/send`);
      setSuccess("X-Ray result sent to dentist successfully!");
      showSuccess(
        `X-Ray result sent to dentist ${
          appointment.dentist?.name || ""
        } successfully!`
      );
      if (onResultSaved) {
        onResultSaved();
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to send X-Ray result";
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getXrayTypeName = (xrayType) => {
    if (!xrayType) return "N/A";
    const type = XRAY_TYPES.find((t) => t.value === xrayType);
    return type
      ? type.abbreviation
        ? `[${type.abbreviation}] ${type.name}`
        : type.name
      : xrayType;
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md space-y-4 md:space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl md:text-2xl font-bold">
          {appointment?.patientName
            ? `X-Ray Result for ${appointment.patientName}`
            : "X-Ray Result Form"}
        </h2>
      </div>

      {/* Patient Information Display */}
      {appointment && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-semibold text-blue-900 mb-4">
            Patient Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-blue-700">Patient Name</p>
              <p className="text-base text-gray-900 font-semibold">
                {appointment.patientName || "N/A"}
              </p>
            </div>
            {appointment.patient?.phone && (
              <div>
                <p className="text-sm font-medium text-blue-700">Phone</p>
                <p className="text-base text-gray-900">
                  {appointment.patient.phone}
                </p>
              </div>
            )}
            {appointment.patient?.age && (
              <div>
                <p className="text-sm font-medium text-blue-700">Age</p>
                <p className="text-base text-gray-900">
                  {appointment.patient.age}
                </p>
              </div>
            )}
            {appointment.patient?.gender && (
              <div>
                <p className="text-sm font-medium text-blue-700">Gender</p>
                <p className="text-base text-gray-900">
                  {appointment.patient.gender}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-blue-700">
                Appointment Date
              </p>
              <p className="text-base text-gray-900">
                {formatDate(appointment.date)}
              </p>
            </div>
            {appointment.dentist?.name && (
              <div>
                <p className="text-sm font-medium text-blue-700">Dentist</p>
                <p className="text-base text-gray-900">
                  {appointment.dentist.name}
                </p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-blue-700">X-Ray Type</p>
              <p className="text-base text-gray-900 font-semibold">
                {getXrayTypeName(appointment.xrayType)}
              </p>
            </div>
            {appointment.patient?.cardNo && (
              <div>
                <p className="text-sm font-medium text-blue-700">Card No</p>
                <p className="text-base text-gray-900">
                  {appointment.patient.cardNo}
                </p>
              </div>
            )}
            {appointment.patient?.address && (
              <div className="md:col-span-2 lg:col-span-3">
                <p className="text-sm font-medium text-blue-700">Address</p>
                <p className="text-base text-gray-900">
                  {appointment.patient.address}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Multiple Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            X-Ray Images (Multiple allowed, max 10)
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {formData.images.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-2">
                {formData.images.length} image(s) selected
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {imagePreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg border border-gray-300"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Show existing images if X-Ray result exists */}
          {xrayResult && xrayResult.id && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Uploaded Images</h3>
              <XrayImageViewer
                xrayId={xrayResult.id}
                onImagesChange={() => {
                  setRefreshImages((prev) => prev + 1);
                }}
                canDelete={true}
                key={refreshImages}
              />
            </div>
          )}
        </div>

        {/* Notes / Findings (Optional - for similar cases or additional notes) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes / Findings (Optional)
          </label>
          <textarea
            name="result"
            rows="4"
            value={formData.result}
            onChange={(e) =>
              setFormData({ ...formData, result: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter any notes, findings, or observations (optional)..."
          />
          <p className="mt-1 text-xs text-gray-500">
            Add notes if there are similar cases or additional observations
          </p>
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <button
            type="submit"
            disabled={loading || formData.images.length === 0}
            className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold min-h-[44px]"
          >
            {loading ? "Saving..." : "Save Result"}
          </button>
          {xrayResult && !xrayResult.sentToDentist && (
            <button
              type="button"
              onClick={handleSendToDentist}
              disabled={
                loading || !xrayResult || !appointment || !appointment.dentistId
              }
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold min-h-[44px]"
              title={
                !appointment
                  ? "Appointment information is required"
                  : !appointment.dentistId
                  ? "No dentist assigned to this appointment"
                  : `Send X-Ray result to ${
                      appointment.dentist?.name || "dentist"
                    }`
              }
            >
              {loading
                ? "Sending..."
                : `Send to ${appointment?.dentist?.name || "Dentist"}`}
            </button>
          )}
          {xrayResult && xrayResult.id && (
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 font-semibold min-h-[44px]"
            >
              Share X-Ray
            </button>
          )}
        </div>

        {xrayResult && xrayResult.sentToDentist && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            Result has been sent to the dentist.
          </div>
        )}
      </form>

      {/* Share Modal */}
      {xrayResult && xrayResult.id && (
        <XrayShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          xrayId={xrayResult.id}
          onShareCreated={() => {
            // Refresh if needed
          }}
        />
      )}
    </div>
  );
};

export default XrayResultFormEnhanced;
