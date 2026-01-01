import { useState, useMemo } from "react";
import {
  DIAGNOSES,
  DIAGNOSIS_CATEGORIES,
} from "../../../utils/dentalConstants";

const DiagnosisSelector = ({
  primaryDiagnosis,
  secondaryDiagnoses = [],
  onPrimaryDiagnosisChange,
  onSecondaryDiagnosesChange,
  allowCustom = true,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showDropdown, setShowDropdown] = useState(false);
  const [customDiagnosis, setCustomDiagnosis] = useState("");
  const [secondaryOther, setSecondaryOther] = useState("");
  const [showSecondaryOther, setShowSecondaryOther] = useState(false);

  // Filter diagnoses based on search and category
  const filteredDiagnoses = useMemo(() => {
    let filtered = DIAGNOSES;

    if (selectedCategory !== "All") {
      filtered = filtered.filter((d) => d.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.code.toLowerCase().includes(query) ||
          d.name.toLowerCase().includes(query) ||
          (d.description && d.description.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [searchQuery, selectedCategory]);

  const handlePrimarySelect = (diagnosis) => {
    if (onPrimaryDiagnosisChange) {
      onPrimaryDiagnosisChange(diagnosis);
    }
    setShowDropdown(false);
    setSearchQuery("");
  };

  const handleSecondaryToggle = (diagnosis) => {
    if (!onSecondaryDiagnosesChange) return;

    const isSelected = secondaryDiagnoses.some(
      (d) => d.code === diagnosis.code
    );
    if (isSelected) {
      onSecondaryDiagnosesChange(
        secondaryDiagnoses.filter((d) => d.code !== diagnosis.code)
      );
    } else {
      onSecondaryDiagnosesChange([...secondaryDiagnoses, diagnosis]);
    }
  };

  const handleAddCustomDiagnosis = () => {
    if (!customDiagnosis.trim()) return;

    const customDiag = {
      code: "CUSTOM",
      name: customDiagnosis,
      category: "Custom",
      description: "Custom diagnosis",
    };

    if (onPrimaryDiagnosisChange && !primaryDiagnosis) {
      onPrimaryDiagnosisChange(customDiag);
    } else if (onSecondaryDiagnosesChange) {
      onSecondaryDiagnosesChange([...secondaryDiagnoses, customDiag]);
    }

    setCustomDiagnosis("");
  };

  return (
    <div className="space-y-4">
      {/* Primary Diagnosis */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Primary Diagnosis *
        </label>
        <div className="relative">
          <div
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            {primaryDiagnosis ? (
              <div className="flex justify-between items-center">
                <span>
                  <span className="font-semibold">{primaryDiagnosis.code}</span>{" "}
                  - {primaryDiagnosis.name}
                  {primaryDiagnosis.category && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({primaryDiagnosis.category})
                    </span>
                  )}
                </span>
                <span className="text-gray-400">▼</span>
              </div>
            ) : (
              <div className="text-gray-500">Select primary diagnosis...</div>
            )}
          </div>

          {showDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-y-auto">
              {/* Search and Category Filter */}
              <div className="p-2 border-b border-gray-200 bg-gray-50">
                <input
                  type="text"
                  placeholder="Search diagnoses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 mb-2"
                  onClick={(e) => e.stopPropagation()}
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="All">All Categories</option>
                  {DIAGNOSIS_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Diagnoses List */}
              <div className="max-h-64 overflow-y-auto">
                {filteredDiagnoses.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No diagnoses found
                  </div>
                ) : (
                  <>
                    {filteredDiagnoses.map((diagnosis) => (
                      <div
                        key={diagnosis.code}
                        className="px-4 py-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-100"
                        onClick={() => handlePrimarySelect(diagnosis)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-semibold text-indigo-700">
                              {diagnosis.code}
                            </div>
                            <div className="text-sm text-gray-700">
                              {diagnosis.name}
                            </div>
                            {diagnosis.description && (
                              <div className="text-xs text-gray-500 mt-1">
                                {diagnosis.description}
                              </div>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 ml-2">
                            {diagnosis.category}
                          </span>
                        </div>
                      </div>
                    ))}
                    {allowCustom && (
                      <div
                        className="px-4 py-2 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 font-semibold text-indigo-700"
                        onClick={() => {
                          setShowDropdown(false);
                          setCustomDiagnosis("");
                        }}
                      >
                        Other (Custom) - Enter below
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Custom Diagnosis */}
              {allowCustom && (
                <div className="p-2 border-t border-gray-200 bg-gray-50">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Or enter custom diagnosis..."
                      value={customDiagnosis}
                      onChange={(e) => setCustomDiagnosis(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      onClick={(e) => e.stopPropagation()}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCustomDiagnosis();
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomDiagnosis}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Secondary Diagnoses */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Secondary Diagnoses (Optional)
        </label>
        {secondaryDiagnoses.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {secondaryDiagnoses.map((diagnosis) => (
              <span
                key={diagnosis.code}
                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {diagnosis.code} - {diagnosis.name}
                <button
                  type="button"
                  onClick={() => handleSecondaryToggle(diagnosis)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Secondary Diagnosis Selector (simplified) */}
        <select
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value=""
          onChange={(e) => {
            if (e.target.value === "OTHER") {
              setShowSecondaryOther(true);
              e.target.value = "";
            } else {
              const selected = DIAGNOSES.find((d) => d.code === e.target.value);
              if (selected) {
                handleSecondaryToggle(selected);
                e.target.value = "";
                setShowSecondaryOther(false);
              }
            }
          }}
        >
          <option value="">Add secondary diagnosis...</option>
          {DIAGNOSES.map((diagnosis) => (
            <option key={diagnosis.code} value={diagnosis.code}>
              {diagnosis.code} - {diagnosis.name}
            </option>
          ))}
          <option value="OTHER">Other (Custom)</option>
        </select>
        {showSecondaryOther && (
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={secondaryOther}
              onChange={(e) => setSecondaryOther(e.target.value)}
              placeholder="Enter custom diagnosis..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyPress={(e) => {
                if (e.key === "Enter" && secondaryOther.trim()) {
                  e.preventDefault();
                  const customDiag = {
                    code: "CUSTOM",
                    name: secondaryOther.trim(),
                    category: "Custom",
                    description: "Custom diagnosis",
                  };
                  if (onSecondaryDiagnosesChange) {
                    onSecondaryDiagnosesChange([
                      ...secondaryDiagnoses,
                      customDiag,
                    ]);
                  }
                  setSecondaryOther("");
                  setShowSecondaryOther(false);
                }
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (secondaryOther.trim()) {
                  const customDiag = {
                    code: "CUSTOM",
                    name: secondaryOther.trim(),
                    category: "Custom",
                    description: "Custom diagnosis",
                  };
                  if (onSecondaryDiagnosesChange) {
                    onSecondaryDiagnosesChange([
                      ...secondaryDiagnoses,
                      customDiag,
                    ]);
                  }
                  setSecondaryOther("");
                  setShowSecondaryOther(false);
                }
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setSecondaryOther("");
                setShowSecondaryOther(false);
              }}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagnosisSelector;
