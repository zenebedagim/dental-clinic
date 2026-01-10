import { useState, useEffect, useRef, memo } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../../services/api";
import useBranch from "../../../hooks/useBranch";
import { useToast } from "../../../hooks/useToast";
import { validatePhone } from "../../../utils/phoneValidator";

const AppointmentForm = memo(({ onAppointmentCreated }) => {
  const { selectedBranch } = useBranch();
  const { success: showSuccess, error: showError } = useToast();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    patientName: "",
    gender: "",
    age: "",
    phoneNumber: "",
    address: "",
    cardNo: "",
    dentistId: "",
    date: "",
    time: "",
    branchId: "",
    visitReason: "",
  });
  const [allDentists, setAllDentists] = useState([]); // Store all dentists
  const [dentists, setDentists] = useState([]); // Filtered dentists by branch
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [availabilityCheck, setAvailabilityCheck] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const availabilityTimeoutRef = useRef(null);
  const availabilityControllerRef = useRef(null);
  const [phoneError, setPhoneError] = useState("");

  const filterDentistsByBranch = (dentistList, branchId) => {
    if (!branchId) {
      setDentists([]);
      return;
    }
    // Filter dentists that belong to the selected branch
    const filtered = dentistList.filter(
      (dentist) => dentist.branchId === branchId
    );
    setDentists(filtered);
  };

  const fetchDoctors = async () => {
    try {
      // Fetch ALL dentists from all branches
      const dentistsResponse = await api.get("/users", {
        params: { role: "DENTIST" },
      });
      const fetchedDentists =
        dentistsResponse.data?.data || dentistsResponse.data || [];
      setAllDentists(fetchedDentists);
      // Initially filter by selected branch if available
      if (formData.branchId) {
        filterDentistsByBranch(fetchedDentists, formData.branchId);
      } else {
        setDentists([]);
      }
    } catch (err) {
      console.error("Error fetching doctors:", err);
    }
  };

  const fetchBranches = async () => {
    try {
      setLoadingBranches(true);
      const response = await api.get("/branches");
      const branchesData = response.data?.data || response.data || [];
      // Filter only active branches
      const activeBranches = branchesData.filter((branch) => branch.isActive);
      setBranches(activeBranches);
    } catch (err) {
      console.error("Error fetching branches:", err);
    } finally {
      setLoadingBranches(false);
    }
  };

  useEffect(() => {
    // Parallelize branch and doctor fetching for faster loading
    Promise.all([fetchBranches(), fetchDoctors()]).catch((err) => {
      console.error("Error fetching initial data:", err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Read URL parameters and pre-fill form data
  useEffect(() => {
    const patientName = searchParams.get("patientName");
    const phoneNumber = searchParams.get("phoneNumber");
    const gender = searchParams.get("gender");
    const address = searchParams.get("address");
    const cardNo = searchParams.get("cardNo");

    if (patientName || phoneNumber || gender || address || cardNo) {
      setFormData((prev) => ({
        ...prev,
        ...(patientName && { patientName: decodeURIComponent(patientName) }),
        ...(phoneNumber && { phoneNumber: decodeURIComponent(phoneNumber) }),
        ...(gender && { gender: decodeURIComponent(gender) }),
        ...(address && { address: decodeURIComponent(address) }),
        ...(cardNo && { cardNo: decodeURIComponent(cardNo) }),
      }));
    }
  }, [searchParams]);

  // Set default branch when selectedBranch changes (only if branchId is not already set)
  useEffect(() => {
    if (selectedBranch?.id) {
      setFormData((prev) => {
        // Only set if branchId is empty
        if (!prev.branchId) {
          return { ...prev, branchId: selectedBranch.id };
        }
        return prev;
      });
    }
  }, [selectedBranch?.id]);

  // Filter dentists when branchId changes
  useEffect(() => {
    if (formData.branchId && allDentists.length > 0) {
      // Filter dentists that belong to the selected branch
      const filtered = allDentists.filter(
        (dentist) => dentist.branchId === formData.branchId
      );
      setDentists(filtered);
      // Clear dentist selection when branch changes
      setFormData((prev) => ({ ...prev, dentistId: "" }));
    } else if (!formData.branchId) {
      setDentists([]);
    }
  }, [formData.branchId, allDentists]);

  const checkDoctorAvailability = async () => {
    if (
      !formData.dentistId ||
      !formData.date ||
      !formData.time ||
      !formData.branchId
    ) {
      return;
    }

    // Cancel previous request if still pending
    if (availabilityControllerRef.current) {
      availabilityControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const controller = new AbortController();
    availabilityControllerRef.current = controller;

    try {
      setCheckingAvailability(true);
      const appointmentDateTime = `${formData.date}T${formData.time}`;

      // Use the selected branch ID from the form
      const branchId = formData.branchId;

      const response = await api.get("/schedules/check", {
        params: {
          doctorId: formData.dentistId,
          branchId: branchId,
          date: formData.date,
          startTime: formData.time,
        },
        signal: controller.signal,
      });

      // Check if request was aborted
      if (controller.signal.aborted) {
        return;
      }

      const availabilityData = response.data?.data || response.data;
      setAvailabilityCheck(availabilityData);

      // Check for conflicts with existing appointments (use selected branch ID)
      const appointmentsResponse = await api.get("/appointments/reception", {
        params: { branchId: branchId },
        signal: controller.signal,
      });

      // Check if request was aborted
      if (controller.signal.aborted) {
        return;
      }

      const appointments =
        appointmentsResponse.data?.data || appointmentsResponse.data || [];

      const appointmentDate = new Date(appointmentDateTime);
      const conflictingAppointments = appointments.filter((apt) => {
        if (
          apt.dentistId !== formData.dentistId ||
          apt.status === "COMPLETED" ||
          apt.status === "CANCELLED"
        ) {
          return false;
        }
        const aptDate = new Date(apt.date);
        const timeDiff = Math.abs(appointmentDate - aptDate) / (1000 * 60);
        return timeDiff < 90; // Conflict if within 90 minutes (improved from 60)
      });

      setConflicts(conflictingAppointments);
    } catch (err) {
      // Ignore abort errors
      if (err.name === "AbortError" || err.name === "CanceledError") {
        return;
      }
      console.error("Error checking availability:", err);
      setAvailabilityCheck(null);
    } finally {
      // Only clear loading if this is still the current request
      if (availabilityControllerRef.current === controller) {
        setCheckingAvailability(false);
      }
    }
  };

  // Check availability when dentist, branch, date, or time changes
  useEffect(() => {
    if (availabilityTimeoutRef.current) {
      clearTimeout(availabilityTimeoutRef.current);
    }

    // Cancel any pending requests
    if (availabilityControllerRef.current) {
      availabilityControllerRef.current.abort();
    }

    if (
      formData.dentistId &&
      formData.branchId &&
      formData.date &&
      formData.time
    ) {
      // Reduced debounce to 300ms for better UX
      availabilityTimeoutRef.current = setTimeout(() => {
        checkDoctorAvailability();
      }, 300);
    } else {
      setAvailabilityCheck(null);
      setConflicts([]);
    }

    return () => {
      if (availabilityTimeoutRef.current) {
        clearTimeout(availabilityTimeoutRef.current);
      }
      // Cancel request on unmount or dependency change
      if (availabilityControllerRef.current) {
        availabilityControllerRef.current.abort();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.dentistId, formData.branchId, formData.date, formData.time]);

  // Load form data from localStorage on mount
  useEffect(() => {
    const savedFormData = localStorage.getItem("appointmentFormDraft");
    if (savedFormData) {
      try {
        const parsed = JSON.parse(savedFormData);
        // Only restore if it's recent (within 24 hours)
        const savedTime = parsed._timestamp;
        if (savedTime && Date.now() - savedTime < 24 * 60 * 60 * 1000) {
          const { _timestamp, ...rest } = parsed;
          setFormData(rest);
        }
      } catch (err) {
        console.error("Error loading form draft:", err);
      }
    }
  }, []);

  // Save form data to localStorage on change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const dataToSave = {
        ...formData,
        _timestamp: Date.now(),
      };
      localStorage.setItem("appointmentFormDraft", JSON.stringify(dataToSave));
    }, 500); // Debounce saves

    return () => clearTimeout(timeoutId);
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };

      // Validate phone number if it's the phone field
      if (name === "phoneNumber") {
        const validation = validatePhone(value, "ET"); // Ethiopia
        if (value && !validation.isValid) {
          setPhoneError(validation.error || "Invalid phone number");
        } else {
          setPhoneError("");
        }
      }

      return updated;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!availabilityCheck?.isAvailable || conflicts.length > 0) {
        showError(
          "Cannot schedule appointment - conflicts detected or doctor unavailable"
        );
        setLoading(false);
        return;
      }

      const appointmentDateTime = `${formData.date}T${formData.time}`;

      // Use the selected branch ID from the form
      if (!formData.branchId) {
        showError("Please select a branch");
        setLoading(false);
        return;
      }

      // Validate phone number
      if (!formData.phoneNumber || formData.phoneNumber.trim().length === 0) {
        showError("Please enter a phone number");
        setLoading(false);
        return;
      }

      // Validate phone format
      const phoneValidation = validatePhone(formData.phoneNumber, "ET");
      if (!phoneValidation.isValid) {
        showError(phoneValidation.error || "Invalid phone number format");
        setPhoneError(phoneValidation.error || "Invalid phone number format");
        setLoading(false);
        return;
      }

      // Step 1: Find or create patient
      let patientId = null;

      // Try to find existing patient by phone number
      if (formData.phoneNumber) {
        try {
          const searchResponse = await api.get("/patients/search", {
            params: { phone: formData.phoneNumber, limit: 1 },
          });
          const existingPatients = Array.isArray(searchResponse.data)
            ? searchResponse.data
            : [];

          if (existingPatients.length > 0) {
            patientId = existingPatients[0].id;
          }
        } catch (err) {
          console.error("Error searching for patient:", err);
          // Continue to create new patient
        }
      }

      // Step 2: Create patient if not found
      if (!patientId) {
        try {
          // Calculate dateOfBirth from age if provided
          let dateOfBirth = null;
          if (formData.age) {
            const ageNum = parseInt(formData.age, 10);
            if (!isNaN(ageNum) && ageNum > 0) {
              const today = new Date();
              dateOfBirth = new Date(
                today.getFullYear() - ageNum,
                today.getMonth(),
                today.getDate()
              );
            }
          }

          const patientData = {
            name: formData.patientName,
            phone: formData.phoneNumber,
            gender: formData.gender || null,
            dateOfBirth: dateOfBirth
              ? dateOfBirth.toISOString().split("T")[0]
              : null,
            address: formData.address || null,
            cardNo: formData.cardNo || null,
          };

          const patientResponse = await api.post("/patients", patientData);
          patientId =
            patientResponse.data?.id ||
            (Array.isArray(patientResponse.data)
              ? patientResponse.data[0]?.id
              : null) ||
            patientResponse.data?.data?.id;

          if (!patientId) {
            throw new Error("Failed to get patient ID from creation response");
          }
        } catch (err) {
          console.error("Error creating patient:", err);
          showError(
            err.response?.data?.message ||
              "Failed to create patient. Please try again."
          );
          setLoading(false);
          return;
        }
      }

      // Step 3: Create appointment with patientId
      if (!patientId) {
        showError("Failed to get patient ID");
        setLoading(false);
        return;
      }

      const dataToSend = {
        patientId, // REQUIRED by server
        patientName: formData.patientName,
        branchId: formData.branchId,
        dentistId: formData.dentistId,
        date: new Date(appointmentDateTime).toISOString(),
        visitReason: formData.visitReason || null,
      };

      await api.post("/appointments", dataToSend);
      showSuccess("Appointment scheduled successfully!");

      // Clear form draft from localStorage
      localStorage.removeItem("appointmentFormDraft");

      // Reset form
      setFormData({
        patientName: "",
        gender: "",
        age: "",
        phoneNumber: "",
        address: "",
        cardNo: "",
        dentistId: "",
        date: "",
        time: "",
        branchId: selectedBranch?.id || "",
        visitReason: "",
      });
      setAvailabilityCheck(null);
      setConflicts([]);
      setPhoneError("");

      // Dispatch event to refresh appointments (dispatch before navigation)
      window.dispatchEvent(new CustomEvent("appointment-created"));

      // Call callback if provided (this will navigate)
      if (onAppointmentCreated) {
        // Small delay to ensure event is processed before navigation
        setTimeout(() => {
          onAppointmentCreated();
        }, 100);
      }
    } catch (err) {
      showError(
        err.response?.data?.message || "Failed to schedule appointment"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="mb-4 text-xl font-bold text-gray-900">
        📆 Appointment Scheduling & Changes
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Personal Information Section */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            1. Personal Information
          </h3>

          {/* Full Name */}
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Full Name *
            </label>
            <input
              type="text"
              name="patientName"
              required
              value={formData.patientName}
              onChange={handleChange}
              placeholder="Enter patient's full name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Gender */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">
              Gender
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="Male"
                  checked={formData.gender === "Male"}
                  onChange={handleChange}
                  className="mr-2 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Male</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="Female"
                  checked={formData.gender === "Female"}
                  onChange={handleChange}
                  className="mr-2 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Female</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="gender"
                  value="Other"
                  checked={formData.gender === "Other"}
                  onChange={handleChange}
                  className="mr-2 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Other</span>
              </label>
            </div>
          </div>

          {/* Age */}
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Age
            </label>
            <input
              type="number"
              name="age"
              value={formData.age}
              onChange={handleChange}
              placeholder="Age (years)"
              min="0"
              max="150"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Phone Number */}
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Phone Number *
            </label>
            <input
              type="tel"
              name="phoneNumber"
              required
              value={formData.phoneNumber}
              onChange={handleChange}
              placeholder="0912345678 (Ethiopia format)"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                phoneError
                  ? "border-red-500 focus:ring-red-500"
                  : "border-gray-300 focus:ring-indigo-500"
              }`}
            />
            {phoneError && (
              <p className="mt-1 text-sm text-red-600">{phoneError}</p>
            )}
          </div>

          {/* Address */}
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="Enter patient's address"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Card Number */}
          <div className="mb-4">
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Card Number
            </label>
            <input
              type="text"
              name="cardNo"
              value={formData.cardNo}
              onChange={handleChange}
              placeholder="Enter patient card/ID number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Branch Selection */}
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            Branch *{" "}
            <span className="text-xs text-gray-500">
              (Select branch for appointment)
            </span>
          </label>
          <select
            name="branchId"
            value={formData.branchId}
            onChange={handleChange}
            required
            disabled={loadingBranches}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">
              {loadingBranches ? "Loading branches..." : "Select Branch"}
            </option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name} {branch.code && `(${branch.code})`}
              </option>
            ))}
          </select>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Date *
            </label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              min={new Date().toISOString().split("T")[0]}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Time *
            </label>
            <input
              type="time"
              name="time"
              value={formData.time}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Dentist Selection - Only dentists from selected branch */}
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            Dentist/Provider *{" "}
            <span className="text-xs text-gray-500">
              (From selected branch)
            </span>
          </label>
          <select
            name="dentistId"
            value={formData.dentistId}
            onChange={handleChange}
            required
            disabled={!formData.branchId || dentists.length === 0}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">
              {!formData.branchId
                ? "Select branch first"
                : dentists.length === 0
                ? "No dentists in this branch"
                : "Select Dentist"}
            </option>
            {dentists.map((dentist) => (
              <option key={dentist.id} value={dentist.id}>
                {dentist.name}
              </option>
            ))}
          </select>
        </div>

        {/* Visit Reason */}
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            Visit Reason / Complaint
          </label>
          <textarea
            name="visitReason"
            value={formData.visitReason}
            onChange={handleChange}
            placeholder="Enter reason for visit or patient's complaint"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Optional: Brief description of why the patient is visiting
          </p>
        </div>

        {/* Availability Check Display */}
        {checkingAvailability && (
          <div className="text-sm text-gray-600">Checking availability...</div>
        )}

        {availabilityCheck && !checkingAvailability && (
          <div
            className={`p-3 rounded-md border ${
              availabilityCheck.isAvailable && conflicts.length === 0
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            {availabilityCheck.isAvailable && conflicts.length === 0 ? (
              <div>
                <p className="font-semibold">
                  ✅ Doctor is available at this time
                </p>
                {availabilityCheck.availableStartTime &&
                  availabilityCheck.availableEndTime && (
                    <p className="mt-1 text-sm">
                      Working hours: {availabilityCheck.availableStartTime} -{" "}
                      {availabilityCheck.availableEndTime}
                    </p>
                  )}
                {!availabilityCheck.schedule && (
                  <p className="mt-1 text-xs opacity-75">
                    Note: No schedule configured for this day
                  </p>
                )}
              </div>
            ) : (
              <div>
                <p className="font-semibold">
                  ❌ Doctor is not available at this time
                </p>
                {availabilityCheck.reason && (
                  <p className="mt-1 text-sm font-medium">
                    {availabilityCheck.reason}
                  </p>
                )}
                {availabilityCheck.suggestion && (
                  <p className="mt-1 text-sm">
                    💡 {availabilityCheck.suggestion}
                  </p>
                )}
                {conflicts.length > 0 && !availabilityCheck.reason && (
                  <p className="mt-1 text-sm">
                    ⚠️ {conflicts.length} conflicting appointment(s) detected
                  </p>
                )}
                {availabilityCheck.availableStartTime &&
                  availabilityCheck.availableEndTime && (
                    <p className="mt-1 text-xs opacity-75">
                      Available hours: {availabilityCheck.availableStartTime} -{" "}
                      {availabilityCheck.availableEndTime}
                    </p>
                  )}
              </div>
            )}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={
            loading ||
            !formData.patientName ||
            !formData.branchId ||
            !formData.dentistId ||
            !formData.date ||
            !formData.time ||
            !availabilityCheck?.isAvailable ||
            conflicts.length > 0
          }
          className="w-full px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Scheduling..." : "Schedule Appointment"}
        </button>
      </form>
    </div>
  );
});

AppointmentForm.displayName = "AppointmentForm";

export default AppointmentForm;
