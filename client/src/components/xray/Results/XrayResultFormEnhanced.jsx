import { useState, useEffect, useCallback } from "react";
import api from "../../../services/api";
import { useToast } from "../../../hooks/useToast";
import XrayImageViewer from "../../common/XrayImageViewer";
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
  const [showSendModal, setShowSendModal] = useState(false);
  const [branches, setBranches] = useState([]);
  const [allDentists, setAllDentists] = useState([]);
  const [dentists, setDentists] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [selectedDentistId, setSelectedDentistId] = useState("");
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingDentists, setLoadingDentists] = useState(false);

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

  const fetchBranches = useCallback(async () => {
    try {
      setLoadingBranches(true);
      const response = await api.get("/branches");
      const branchesData = response.data?.data || response.data || [];
      const activeBranches = branchesData.filter((branch) => branch.isActive);
      setBranches(activeBranches);
    } catch (err) {
      console.error("Error fetching branches:", err);
      showError("Failed to load branches");
    } finally {
      setLoadingBranches(false);
    }
  }, [showError]);

  const fetchDentists = useCallback(async () => {
    try {
      setLoadingDentists(true);
      const response = await api.get("/users", {
        params: { role: "DENTIST" },
      });
      const fetchedDentists = response.data?.data || response.data || [];
      setAllDentists(fetchedDentists);

      // Filter by selected branch if branch is selected
      if (selectedBranchId) {
        const filtered = fetchedDentists.filter(
          (dentist) => dentist.branchId === selectedBranchId
        );
        setDentists(filtered);
      } else {
        setDentists([]);
      }
    } catch (err) {
      console.error("Error fetching dentists:", err);
      showError("Failed to load dentists");
    } finally {
      setLoadingDentists(false);
    }
  }, [selectedBranchId, showError]);

  useEffect(() => {
    if (showSendModal) {
      fetchBranches();
      fetchDentists();
    }
  }, [showSendModal, fetchBranches, fetchDentists]);

  useEffect(() => {
    if (selectedBranchId && allDentists.length > 0) {
      const filtered = allDentists.filter(
        (dentist) => dentist.branchId === selectedBranchId
      );
      setDentists(filtered);
      setSelectedDentistId(""); // Reset dentist selection when branch changes
    } else {
      setDentists([]);
      setSelectedDentistId("");
    }
  }, [selectedBranchId, allDentists]);

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

      // Append multiple images (if any)
      if (formData.images.length > 0) {
        formData.images.forEach((image) => {
          submitData.append("images", image);
        });
      }

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

    if (!selectedBranchId) {
      showError("Please select a branch");
      return;
    }

    if (!selectedDentistId) {
      showError("Please select a dentist");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Always send dentistId since we validate it's required before this point
      await api.put(`/xray/${xrayResult.id}/send`, {
        dentistId: selectedDentistId,
      });
      const selectedDentist = dentists.find((d) => d.id === selectedDentistId);
      setSuccess("X-Ray result sent to dentist successfully!");
      showSuccess(
        `X-Ray result sent to dentist ${
          selectedDentist?.name || "dentist"
        } successfully!`
      );
      setShowSendModal(false);
      setSelectedBranchId("");
      setSelectedDentistId("");
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

      {/* Clinical Information from Dentist */}
      {appointment?.treatment && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 md:p-6 mb-4">
          <h3 className="text-lg md:text-xl font-semibold text-indigo-900 mb-4">
            Clinical Information from Dentist
          </h3>
          <div className="space-y-4">
            {appointment.treatment.chiefComplaint && (
              <div>
                <p className="text-sm font-medium text-indigo-700 mb-1">
                  Chief Complaint
                </p>
                <p className="text-base text-gray-900 bg-white p-3 rounded border border-indigo-100">
                  {appointment.treatment.chiefComplaint}
                </p>
              </div>
            )}
            {appointment.treatment.historyPresentIllness && (
              <div>
                <p className="text-sm font-medium text-indigo-700 mb-1">
                  History of Present Illness
                </p>
                <p className="text-base text-gray-900 bg-white p-3 rounded border border-indigo-100 whitespace-pre-wrap">
                  {appointment.treatment.historyPresentIllness}
                </p>
              </div>
            )}
            {appointment.treatment.medicalHistory && (
              <div>
                <p className="text-sm font-medium text-indigo-700 mb-1">
                  Medical History
                </p>
                <p className="text-base text-gray-900 bg-white p-3 rounded border border-indigo-100 whitespace-pre-wrap">
                  {appointment.treatment.medicalHistory}
                </p>
              </div>
            )}
            {appointment.treatment.dentalHistory && (
              <div>
                <p className="text-sm font-medium text-indigo-700 mb-1">
                  Dental History
                </p>
                <p className="text-base text-gray-900 bg-white p-3 rounded border border-indigo-100 whitespace-pre-wrap">
                  {appointment.treatment.dentalHistory}
                </p>
              </div>
            )}
            {appointment.treatment.clinicalExam && (
              <div>
                <p className="text-sm font-medium text-indigo-700 mb-1">
                  Provisional Findings / Impression
                </p>
                <p className="text-base text-gray-900 bg-white p-3 rounded border border-indigo-100 whitespace-pre-wrap">
                  {typeof appointment.treatment.clinicalExam === "object"
                    ? appointment.treatment.clinicalExam.provisionalFindings ||
                      "See clinical examination details"
                    : appointment.treatment.clinicalExam}
                </p>
              </div>
            )}
            {appointment.treatment.diagnosisCode && (
              <div>
                <p className="text-sm font-medium text-indigo-700 mb-1">
                  Diagnosis
                </p>
                <p className="text-base text-gray-900 bg-white p-3 rounded border border-indigo-100">
                  <span className="font-semibold">
                    {appointment.treatment.diagnosisCode}
                  </span>
                  {appointment.treatment.diagnosis && (
                    <span className="ml-2">
                      - {appointment.treatment.diagnosis}
                    </span>
                  )}
                </p>
              </div>
            )}
            {appointment.treatment.treatmentPlan && (
              <div>
                <p className="text-sm font-medium text-indigo-700 mb-1">
                  Treatment Plan
                </p>
                <p className="text-base text-gray-900 bg-white p-3 rounded border border-indigo-100 whitespace-pre-wrap">
                  {appointment.treatment.treatmentPlan}
                </p>
              </div>
            )}
            {appointment.treatment.affectedTeeth &&
              Array.isArray(appointment.treatment.affectedTeeth) &&
              appointment.treatment.affectedTeeth.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-indigo-700 mb-1">
                    Affected Teeth
                  </p>
                  <p className="text-base text-gray-900 bg-white p-3 rounded border border-indigo-100">
                    {appointment.treatment.affectedTeeth.join(", ")}
                  </p>
                </div>
              )}
            {appointment.treatment.investigations && (
              <div>
                <p className="text-sm font-medium text-indigo-700 mb-1">
                  Investigations Requested
                </p>
                <div className="bg-white p-3 rounded border border-indigo-100">
                  {typeof appointment.treatment.investigations === "object" &&
                  appointment.treatment.investigations.types ? (
                    <div className="space-y-1">
                      {appointment.treatment.investigations.types.map(
                        (type, idx) => (
                          <span
                            key={idx}
                            className="inline-block bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm mr-2 mb-1"
                          >
                            {getXrayTypeName(type)}
                          </span>
                        )
                      )}
                      {appointment.treatment.investigations.other && (
                        <p className="text-base text-gray-900 mt-2">
                          Other: {appointment.treatment.investigations.other}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-base text-gray-900">
                      {JSON.stringify(appointment.treatment.investigations)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
            disabled={loading}
            className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold min-h-[44px]"
          >
            {loading ? "Saving..." : "Save Result"}
          </button>
          {xrayResult && (
            <button
              type="button"
              onClick={() => setShowSendModal(true)}
              disabled={loading || !xrayResult}
              className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed font-semibold min-h-[44px]"
            >
              Send to Dentist
            </button>
          )}
        </div>
      </form>

      {/* Send to Dentist Modal */}
      {showSendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Send X-Ray to Dentist</h3>

            <div className="space-y-4">
              {/* Branch Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Branch *
                </label>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  disabled={loadingBranches}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a branch...</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dentist Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Dentist *
                </label>
                <select
                  value={selectedDentistId}
                  onChange={(e) => setSelectedDentistId(e.target.value)}
                  disabled={!selectedBranchId || loadingDentists}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {!selectedBranchId
                      ? "Select a branch first..."
                      : dentists.length === 0
                      ? "No dentists available in this branch"
                      : "Select a dentist..."}
                  </option>
                  {dentists.map((dentist) => (
                    <option key={dentist.id} value={dentist.id}>
                      {dentist.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowSendModal(false);
                  setSelectedBranchId("");
                  setSelectedDentistId("");
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendToDentist}
                disabled={
                  loading ||
                  !selectedBranchId ||
                  !selectedDentistId ||
                  loadingBranches ||
                  loadingDentists
                }
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default XrayResultFormEnhanced;
