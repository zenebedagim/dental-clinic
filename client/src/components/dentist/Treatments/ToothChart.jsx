import { useState } from "react";
import {
  PRIMARY_TEETH,
  PERMANENT_TEETH,
  DENTAL_PROCEDURES,
  PROCEDURE_CATEGORIES,
} from "../../../utils/dentalConstants";

const ToothChart = ({
  selectedTeeth = [],
  onTeethChange,
  procedureLogs = [],
  onProcedureSelectForTooth,
  primaryDiagnosis = null,
  secondaryDiagnoses = [],
}) => {
  const [toothType, setToothType] = useState("permanent"); // "primary" or "permanent"
  const teeth = toothType === "primary" ? PRIMARY_TEETH : PERMANENT_TEETH;

  const handleToothClick = (toothNumber) => {
    if (!onTeethChange) return;

    const isSelected = selectedTeeth.includes(toothNumber);
    if (isSelected) {
      onTeethChange(selectedTeeth.filter((t) => t !== toothNumber));
    } else {
      onTeethChange([...selectedTeeth, toothNumber]);
    }
  };

  /**
   * Check if a procedure's tooth field matches a tooth number
   * Handles formats like "14", "18-19", "14,15", "A", etc.
   */
  const procedureMatchesTooth = (procedure, toothNumber) => {
    if (!procedure.tooth) return false;

    const toothStr = String(toothNumber);
    const procedureTooth = String(procedure.tooth).trim();

    // Check for exact match
    if (procedureTooth === toothStr) return true;

    // Check if it contains the tooth number (handles ranges like "18-19", lists like "14,15,16")
    const parts = procedureTooth.split(/[,\-–—]/).map((p) => p.trim());
    return parts.some((part) => part === toothStr);
  };

  /**
   * Get procedures for a specific tooth
   */
  const getProceduresForTooth = (toothNumber) => {
    return procedureLogs.filter((procedure) =>
      procedureMatchesTooth(procedure, toothNumber)
    );
  };

  const getToothColor = (toothNumber) => {
    // Default: selected vs unselected
    if (selectedTeeth.includes(toothNumber)) {
      const proceduresCount = getProceduresForTooth(toothNumber).length;
      if (proceduresCount > 0) {
        return "bg-green-200 border-green-500 ring-2 ring-green-300";
      }
      return "bg-indigo-200 border-indigo-500 ring-2 ring-indigo-300";
    }
    return "bg-white border-gray-300 hover:bg-gray-50";
  };

  // Group teeth by quadrant
  const quadrants = {
    UR: teeth.filter((t) => t.quadrant === "UR"),
    UL: teeth.filter((t) => t.quadrant === "UL"),
    LL: teeth.filter((t) => t.quadrant === "LL"),
    LR: teeth.filter((t) => t.quadrant === "LR"),
  };

  const quadrantLabels = {
    UR: "Upper Right",
    UL: "Upper Left",
    LL: "Lower Left",
    LR: "Lower Right",
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      {/* Toggle Primary/Permanent */}
      <div className="mb-4 flex gap-4 items-center">
        <label className="flex items-center">
          <input
            type="radio"
            value="permanent"
            checked={toothType === "permanent"}
            onChange={(e) => setToothType(e.target.value)}
            className="mr-2"
          />
          Permanent (Adult) Teeth
        </label>
        <label className="flex items-center">
          <input
            type="radio"
            value="primary"
            checked={toothType === "primary"}
            onChange={(e) => setToothType(e.target.value)}
            className="mr-2"
          />
          Primary (Baby) Teeth
        </label>
      </div>

      {/* Tooth Chart Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 p-2 bg-gray-100 font-semibold">
                Number
              </th>
              <th className="border border-gray-300 p-2 bg-gray-100 font-semibold">
                Tooth Name
              </th>
              {Object.keys(quadrants).map((quad) => (
                <th
                  key={quad}
                  className="border border-gray-300 p-2 bg-gray-100 font-semibold text-center"
                >
                  {quadrantLabels[quad]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Render teeth in dental order (position 8 to 1, then 1 to 8 for each quadrant) */}
            {Array.from({ length: 8 }, (_, posIndex) => {
              const position = 8 - posIndex; // Start from position 8 (molar) to 1 (incisor)
              return (
                <tr key={position}>
                  {/* First row: show position/name info only in first column */}
                  {posIndex === 0 && (
                    <>
                      <td
                        className="border border-gray-300 p-2 bg-gray-50 font-medium"
                        rowSpan={toothType === "primary" ? 5 : 8}
                      >
                        <div className="text-center">
                          {toothType === "primary" ? "1-20" : "1-32"}
                        </div>
                      </td>
                      <td
                        className="border border-gray-300 p-2 bg-gray-50 font-medium"
                        rowSpan={toothType === "primary" ? 5 : 8}
                      >
                        <div className="text-xs">
                          {toothType === "primary"
                            ? "Primary Teeth"
                            : "Permanent Teeth"}
                        </div>
                      </td>
                    </>
                  )}
                  {/* Render teeth for each quadrant at this position */}
                  {Object.keys(quadrants).map((quad) => {
                    const tooth = quadrants[quad].find(
                      (t) => t.position === position
                    );
                    if (!tooth)
                      return (
                        <td
                          key={quad}
                          className="border border-gray-300 p-2"
                        ></td>
                      );

                    const isSelected = selectedTeeth.includes(tooth.number);
                    const procedures = getProceduresForTooth(tooth.number);

                    return (
                      <td
                        key={quad}
                        className={`border-2 p-3 text-center cursor-pointer transition-all ${getToothColor(
                          tooth.number
                        )}`}
                        onClick={() => handleToothClick(tooth.number)}
                        title={`${tooth.number} - ${tooth.name}`}
                      >
                        <div className="flex flex-col items-center">
                          <span className="font-bold text-lg">
                            {tooth.number}
                          </span>
                          <span className="text-xs text-gray-600">
                            {tooth.name}
                          </span>
                          {isSelected && (
                            <span className="text-xs mt-1 text-indigo-700 font-semibold">
                              Selected
                            </span>
                          )}
                          {procedures.length > 0 && (
                            <span className="text-xs mt-1 px-1 py-0.5 bg-green-100 text-green-800 rounded font-semibold">
                              {procedures.length}{" "}
                              {procedures.length === 1
                                ? "Procedure"
                                : "Procedures"}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected Teeth Summary with Procedures Performed */}
      {selectedTeeth.length > 0 && (
        <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
          <div className="font-semibold text-sm text-indigo-900 mb-3">
            Selected Teeth ({selectedTeeth.length}) - Procedures Performed:
          </div>
          <div className="space-y-4">
            {selectedTeeth.map((toothNumber) => {
              const tooth = teeth.find(
                (t) => t.number === parseInt(toothNumber)
              );
              const procedures = getProceduresForTooth(toothNumber);

              if (!tooth) return null;

              return (
                <div
                  key={toothNumber}
                  className="bg-white p-4 rounded-lg border border-gray-200"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="font-medium text-base text-gray-900">
                      {primaryDiagnosis && (
                        <span className="text-indigo-700 font-semibold">
                          Primary:{" "}
                        </span>
                      )}
                      {!primaryDiagnosis &&
                        secondaryDiagnoses &&
                        secondaryDiagnoses.length > 0 && (
                          <span className="text-indigo-700 font-semibold">
                            Secondary:{" "}
                          </span>
                        )}
                      Tooth {tooth.number} - {tooth.name}
                    </div>
                    {onProcedureSelectForTooth && (
                      <div className="flex-1 max-w-xs ml-4">
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              onProcedureSelectForTooth(
                                toothNumber,
                                e.target.value
                              );
                              e.target.value = ""; // Reset selector
                            }
                          }}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">Select Procedure...</option>
                          {PROCEDURE_CATEGORIES.map((category) => (
                            <optgroup key={category} label={category}>
                              {DENTAL_PROCEDURES.filter(
                                (p) => p.category === category
                              ).map((proc) => (
                                <option key={proc.name} value={proc.name}>
                                  {proc.name}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {procedures.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      No procedures performed on this tooth
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {procedures.map((procedure, index) => (
                        <div
                          key={index}
                          className="border-l-4 border-indigo-500 pl-4 py-2 bg-gray-50 rounded-r"
                        >
                          <div className="font-semibold text-sm text-gray-900 mb-1">
                            {procedure.name || "-"}
                          </div>
                          {procedure.description && (
                            <div className="text-sm text-gray-700 mb-1">
                              <span className="font-medium">Description:</span>{" "}
                              {procedure.description}
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
                            {procedure.duration && (
                              <div>
                                <span className="font-medium">Duration:</span>{" "}
                                {procedure.duration} min
                              </div>
                            )}
                            {procedure.anesthesia && (
                              <div>
                                <span className="font-medium">Anesthesia:</span>{" "}
                                {procedure.anesthesia}
                              </div>
                            )}
                          </div>
                          {procedure.notes && (
                            <div className="text-sm text-gray-700 mt-2">
                              <span className="font-medium">Notes:</span>{" "}
                              {procedure.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ToothChart;
