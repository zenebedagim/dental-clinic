import { useState } from "react";

const VitalSignsForm = ({ vitalSigns = null, onVitalSignsChange }) => {
  const [formData, setFormData] = useState({
    temperature: vitalSigns?.temperature || "",
    temperatureUnit: vitalSigns?.temperatureUnit || "C", // C or F
    bpSystolic: vitalSigns?.bpSystolic || "",
    bpDiastolic: vitalSigns?.bpDiastolic || "",
    pulseRate: vitalSigns?.pulseRate || "",
    respiratoryRate: vitalSigns?.respiratoryRate || "",
    oxygenSaturation: vitalSigns?.oxygenSaturation || "",
    weight: vitalSigns?.weight || "",
    height: vitalSigns?.height || "",
  });

  const handleChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    if (onVitalSignsChange) {
      onVitalSignsChange(updated);
    }
  };

  const convertTemperature = (value, fromUnit, toUnit) => {
    if (!value) return "";
    const num = parseFloat(value);
    if (isNaN(num)) return "";

    if (fromUnit === "C" && toUnit === "F") {
      return ((num * 9) / 5 + 32).toFixed(1);
    } else if (fromUnit === "F" && toUnit === "C") {
      return (((num - 32) * 5) / 9).toFixed(1);
    }
    return value;
  };

  const handleTemperatureUnitChange = (newUnit) => {
    const currentTemp = formData.temperature;
    if (currentTemp && formData.temperatureUnit !== newUnit) {
      const converted = convertTemperature(
        currentTemp,
        formData.temperatureUnit,
        newUnit
      );
      handleChange("temperature", converted);
    }
    handleChange("temperatureUnit", newUnit);
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Vital Signs</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Body Temperature */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Body Temperature
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              step="0.1"
              value={formData.temperature}
              onChange={(e) => handleChange("temperature", e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="36.5"
            />
            <select
              value={formData.temperatureUnit}
              onChange={(e) => handleTemperatureUnitChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="C">°C</option>
              <option value="F">°F</option>
            </select>
          </div>
        </div>

        {/* Blood Pressure */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Blood Pressure (mmHg)
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={formData.bpSystolic}
              onChange={(e) => handleChange("bpSystolic", e.target.value)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="120"
            />
            <span className="text-gray-500">/</span>
            <input
              type="number"
              value={formData.bpDiastolic}
              onChange={(e) => handleChange("bpDiastolic", e.target.value)}
              className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="80"
            />
            <span className="text-xs text-gray-500">Systolic/Diastolic</span>
          </div>
        </div>

        {/* Pulse Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Pulse Rate (bpm)
          </label>
          <input
            type="number"
            value={formData.pulseRate}
            onChange={(e) => handleChange("pulseRate", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="72"
          />
        </div>

        {/* Respiratory Rate */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Respiratory Rate (breaths/min)
          </label>
          <input
            type="number"
            value={formData.respiratoryRate}
            onChange={(e) => handleChange("respiratoryRate", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="16"
          />
        </div>

        {/* Oxygen Saturation (Optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Oxygen Saturation (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={formData.oxygenSaturation}
            onChange={(e) => handleChange("oxygenSaturation", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="98"
          />
        </div>

        {/* Weight */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Weight (kg)
          </label>
          <input
            type="number"
            step="0.1"
            value={formData.weight}
            onChange={(e) => handleChange("weight", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="70"
          />
        </div>

        {/* Height */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Height (cm)
          </label>
          <input
            type="number"
            step="0.1"
            value={formData.height}
            onChange={(e) => handleChange("height", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="170"
          />
        </div>
      </div>

      {/* BMI Calculation (if weight and height are provided) */}
      {formData.weight && formData.height && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <span className="text-sm font-medium text-blue-900">
            BMI:{" "}
            {(
              parseFloat(formData.weight) /
              Math.pow(parseFloat(formData.height) / 100, 2)
            ).toFixed(1)}
          </span>
        </div>
      )}
    </div>
  );
};

export default VitalSignsForm;
