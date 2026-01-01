import { useState } from "react";
import { PRIMARY_TEETH, PERMANENT_TEETH } from "../../../utils/dentalConstants";

const XrayFindingsTable = ({ findings = [], onFindingsChange }) => {
  const [toothType, setToothType] = useState("permanent");
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    tooth: "",
    findings: "",
    condition: "",
    recommendations: "",
  });

  const teeth = toothType === "primary" ? PRIMARY_TEETH : PERMANENT_TEETH;

  const handleAdd = () => {
    if (!formData.tooth) return;

    const toothNumber = parseInt(formData.tooth);
    const tooth = teeth.find(
      (t) =>
        t.number === toothNumber ||
        t.name.toLowerCase().includes(formData.tooth.toLowerCase())
    );

    const newFinding = {
      tooth: formData.tooth,
      toothNumber: tooth?.number || toothNumber,
      toothName: tooth?.name || "",
      findings: formData.findings,
      condition: formData.condition,
      recommendations: formData.recommendations,
    };

    if (editingIndex !== null) {
      const updated = [...findings];
      updated[editingIndex] = newFinding;
      if (onFindingsChange) {
        onFindingsChange(updated);
      }
      setEditingIndex(null);
    } else {
      if (onFindingsChange) {
        onFindingsChange([...findings, newFinding]);
      }
    }

    setFormData({
      tooth: "",
      findings: "",
      condition: "",
      recommendations: "",
    });
  };

  const handleEdit = (index) => {
    const finding = findings[index];
    setFormData({
      tooth: finding.toothNumber?.toString() || finding.tooth || "",
      findings: finding.findings || "",
      condition: finding.condition || "",
      recommendations: finding.recommendations || "",
    });
    setEditingIndex(index);
  };

  const handleDelete = (index) => {
    if (onFindingsChange) {
      onFindingsChange(findings.filter((_, i) => i !== index));
    }
  };

  const getToothInfo = (toothValue) => {
    const toothNumber = parseInt(toothValue);
    const tooth = teeth.find((t) => t.number === toothNumber);
    return tooth ? `${tooth.number} - ${tooth.name}` : toothValue;
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">X-Ray Findings by Tooth</h3>
        <div className="flex gap-2">
          <label className="flex items-center">
            <input
              type="radio"
              value="permanent"
              checked={toothType === "permanent"}
              onChange={(e) => setToothType(e.target.value)}
              className="mr-1"
            />
            Permanent
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              value="primary"
              checked={toothType === "primary"}
              onChange={(e) => setToothType(e.target.value)}
              className="mr-1"
            />
            Primary
          </label>
        </div>
      </div>

      {/* Add/Edit Form */}
      <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="font-semibold mb-3">
          {editingIndex !== null ? "Edit Finding" : "Add Finding"}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tooth Number *
            </label>
            <input
              type="text"
              list="teeth-list"
              value={formData.tooth}
              onChange={(e) => setFormData({ ...formData, tooth: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="e.g., 14, 1, 32"
            />
            <datalist id="teeth-list">
              {teeth.map((tooth) => (
                <option
                  key={tooth.number}
                  value={tooth.number.toString()}
                >{`${tooth.number} - ${tooth.name}`}</option>
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition
            </label>
            <select
              value={formData.condition}
              onChange={(e) =>
                setFormData({ ...formData, condition: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select condition...</option>
              <option value="NORMAL">Normal</option>
              <option value="CARIES">Caries</option>
              <option value="PERIAPICAL_LESION">Periapical Lesion</option>
              <option value="ROOT_RESORPTION">Root Resorption</option>
              <option value="IMPACTED">Impacted</option>
              <option value="MISSING">Missing</option>
              <option value="FRACTURE">Fracture</option>
              <option value="RADICULAR_CYST">Radicular Cyst</option>
              <option value="PERIODONTAL_LOSS">Periodontal Bone Loss</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Findings *
            </label>
            <textarea
              value={formData.findings}
              onChange={(e) =>
                setFormData({ ...formData, findings: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Describe radiographic findings for this tooth..."
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recommendations
            </label>
            <textarea
              value={formData.recommendations}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  recommendations: e.target.value,
                })
              }
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Recommendations for this tooth..."
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          {editingIndex !== null && (
            <button
              type="button"
              onClick={() => {
                setEditingIndex(null);
                setFormData({
                  tooth: "",
                  findings: "",
                  condition: "",
                  recommendations: "",
                });
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={handleAdd}
            disabled={!formData.tooth || !formData.findings}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {editingIndex !== null ? "Update" : "Add"} Finding
          </button>
        </div>
      </div>

      {/* Findings Table */}
      {findings.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          No findings added. Click "Add Finding" to add one.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">Tooth</th>
                <th className="border border-gray-300 p-2 text-left">Condition</th>
                <th className="border border-gray-300 p-2 text-left">Findings</th>
                <th className="border border-gray-300 p-2 text-left">
                  Recommendations
                </th>
                <th className="border border-gray-300 p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {findings.map((finding, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-2">
                    <div className="font-mono text-sm font-semibold">
                      {finding.toothNumber || finding.tooth}
                    </div>
                    {finding.toothName && (
                      <div className="text-xs text-gray-600">{finding.toothName}</div>
                    )}
                  </td>
                  <td className="border border-gray-300 p-2">
                    {finding.condition ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {finding.condition.replace(/_/g, " ")}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border border-gray-300 p-2 text-sm">
                    {finding.findings}
                  </td>
                  <td className="border border-gray-300 p-2 text-sm">
                    {finding.recommendations || "-"}
                  </td>
                  <td className="border border-gray-300 p-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(index)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default XrayFindingsTable;

