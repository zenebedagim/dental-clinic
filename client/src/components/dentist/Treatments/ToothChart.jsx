import { useState } from "react";
import {
  PRIMARY_TEETH,
  PERMANENT_TEETH,
  TOOTH_CONDITIONS,
} from "../../../utils/dentalConstants";

const ToothChart = ({
  selectedTeeth = [],
  onTeethChange,
  toothConditions = {},
  onConditionChange,
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

  const getToothColor = (toothNumber) => {
    const condition = toothConditions[toothNumber];
    if (condition) {
      const conditionObj = TOOTH_CONDITIONS.find((c) => c.value === condition);
      if (conditionObj) {
        const colorMap = {
          green: "bg-green-200 border-green-400",
          red: "bg-red-200 border-red-400",
          blue: "bg-blue-200 border-blue-400",
          gray: "bg-gray-300 border-gray-500",
          black: "bg-black text-white border-black",
          orange: "bg-orange-200 border-orange-400",
          yellow: "bg-yellow-200 border-yellow-400",
          purple: "bg-purple-200 border-purple-400",
          indigo: "bg-indigo-200 border-indigo-400",
          pink: "bg-pink-200 border-pink-400",
          teal: "bg-teal-200 border-teal-400",
        };
        return colorMap[conditionObj.color] || "bg-gray-100 border-gray-300";
      }
    }

    // Default: selected vs unselected
    if (selectedTeeth.includes(toothNumber)) {
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
                    const condition = toothConditions[tooth.number];

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
                          {condition && (
                            <span className="text-xs mt-1 px-1 py-0.5 bg-white rounded">
                              {TOOTH_CONDITIONS.find(
                                (c) => c.value === condition
                              )?.label || condition}
                            </span>
                          )}
                          {isSelected && (
                            <span className="text-xs mt-1 text-indigo-700 font-semibold">
                              Selected
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

      {/* Selected Teeth Summary with Condition Selection */}
      {selectedTeeth.length > 0 && (
        <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
          <div className="font-semibold text-sm text-indigo-900 mb-3">
            Selected Teeth ({selectedTeeth.length}) - Select Condition:
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {selectedTeeth.map((toothNumber) => {
              const tooth = teeth.find(
                (t) => t.number === parseInt(toothNumber)
              );
              const currentCondition = toothConditions[toothNumber] || "";

              if (!tooth) return null;

              return (
                <div
                  key={toothNumber}
                  className="bg-white p-3 rounded-lg border border-gray-200"
                >
                  <div className="font-medium text-sm text-gray-900 mb-2">
                    {tooth.number} - {tooth.name}
                  </div>
                  {onConditionChange && (
                    <select
                      value={currentCondition}
                      onChange={(e) => {
                        const newConditions = {
                          ...toothConditions,
                          [toothNumber]: e.target.value || undefined,
                        };
                        // Remove undefined values
                        Object.keys(newConditions).forEach((key) => {
                          if (newConditions[key] === undefined) {
                            delete newConditions[key];
                          }
                        });
                        onConditionChange(newConditions);
                      }}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select condition...</option>
                      {TOOTH_CONDITIONS.map((condition) => (
                        <option key={condition.value} value={condition.value}>
                          {condition.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {currentCondition && (
                    <div className="mt-2">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                          TOOTH_CONDITIONS.find(
                            (c) => c.value === currentCondition
                          )?.color === "green"
                            ? "bg-green-200 text-green-800"
                            : TOOTH_CONDITIONS.find(
                                (c) => c.value === currentCondition
                              )?.color === "red"
                            ? "bg-red-200 text-red-800"
                            : TOOTH_CONDITIONS.find(
                                (c) => c.value === currentCondition
                              )?.color === "blue"
                            ? "bg-blue-200 text-blue-800"
                            : TOOTH_CONDITIONS.find(
                                (c) => c.value === currentCondition
                              )?.color === "gray"
                            ? "bg-gray-300 text-gray-800"
                            : TOOTH_CONDITIONS.find(
                                (c) => c.value === currentCondition
                              )?.color === "black"
                            ? "bg-black text-white"
                            : TOOTH_CONDITIONS.find(
                                (c) => c.value === currentCondition
                              )?.color === "orange"
                            ? "bg-orange-200 text-orange-800"
                            : TOOTH_CONDITIONS.find(
                                (c) => c.value === currentCondition
                              )?.color === "yellow"
                            ? "bg-yellow-200 text-yellow-800"
                            : TOOTH_CONDITIONS.find(
                                (c) => c.value === currentCondition
                              )?.color === "purple"
                            ? "bg-purple-200 text-purple-800"
                            : TOOTH_CONDITIONS.find(
                                (c) => c.value === currentCondition
                              )?.color === "indigo"
                            ? "bg-indigo-200 text-indigo-800"
                            : TOOTH_CONDITIONS.find(
                                (c) => c.value === currentCondition
                              )?.color === "pink"
                            ? "bg-pink-200 text-pink-800"
                            : "bg-teal-200 text-teal-800"
                        }`}
                      >
                        {TOOTH_CONDITIONS.find(
                          (c) => c.value === currentCondition
                        )?.label || currentCondition}
                      </span>
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
