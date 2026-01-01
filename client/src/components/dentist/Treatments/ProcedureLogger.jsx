import { useState } from "react";
import {
  DENTAL_PROCEDURES,
  PROCEDURE_CATEGORIES,
} from "../../../utils/dentalConstants";

const ProcedureLogger = ({ procedures = [], onProceduresChange }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    tooth: "",
    duration: "",
    anesthesia: "",
    notes: "",
  });

  const handleAdd = () => {
    if (!formData.code) return;

    const procedure = DENTAL_PROCEDURES.find((p) => p.code === formData.code);
    const newProcedure = {
      ...formData,
      description: formData.description || procedure?.name || "",
      duration: formData.duration ? parseInt(formData.duration) : null,
    };

    if (editingIndex !== null) {
      // Edit existing
      const updated = [...procedures];
      updated[editingIndex] = newProcedure;
      if (onProceduresChange) {
        onProceduresChange(updated);
      }
      setEditingIndex(null);
    } else {
      // Add new
      if (onProceduresChange) {
        onProceduresChange([...procedures, newProcedure]);
      }
    }

    // Reset form
    setFormData({
      code: "",
      description: "",
      tooth: "",
      duration: "",
      anesthesia: "",
      notes: "",
    });
    setShowAddForm(false);
  };

  const handleEdit = (index) => {
    const procedure = procedures[index];
    setFormData({
      code: procedure.code || "",
      description: procedure.description || "",
      tooth: procedure.tooth || "",
      duration: procedure.duration?.toString() || "",
      anesthesia: procedure.anesthesia || "",
      notes: procedure.notes || "",
    });
    setEditingIndex(index);
    setShowAddForm(true);
  };

  const handleDelete = (index) => {
    if (onProceduresChange) {
      onProceduresChange(procedures.filter((_, i) => i !== index));
    }
  };

  const handleProcedureCodeChange = (code) => {
    const procedure = DENTAL_PROCEDURES.find((p) => p.code === code);
    setFormData({
      ...formData,
      code,
      description: procedure?.name || formData.description,
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Procedures Performed</h3>
        <button
          type="button"
          onClick={() => {
            setShowAddForm(!showAddForm);
            setEditingIndex(null);
            setFormData({
              code: "",
              description: "",
              tooth: "",
              duration: "",
              anesthesia: "",
              notes: "",
            });
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          {showAddForm ? "Cancel" : "+ Add Procedure"}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-semibold mb-3">
            {editingIndex !== null ? "Edit Procedure" : "Add New Procedure"}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Procedure Code *
              </label>
              <select
                value={formData.code}
                onChange={(e) => handleProcedureCodeChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select procedure...</option>
                {PROCEDURE_CATEGORIES.map((category) => (
                  <optgroup key={category} label={category}>
                    {DENTAL_PROCEDURES.filter(
                      (p) => p.category === category
                    ).map((proc) => (
                      <option key={proc.code} value={proc.code}>
                        {proc.code} - {proc.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Procedure description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tooth (Optional)
              </label>
              <input
                type="text"
                value={formData.tooth}
                onChange={(e) =>
                  setFormData({ ...formData, tooth: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., 14, A, 18-19"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) =>
                  setFormData({ ...formData, duration: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., 30"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anesthesia
              </label>
              <input
                type="text"
                value={formData.anesthesia}
                onChange={(e) =>
                  setFormData({ ...formData, anesthesia: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Local anesthetic, 2% Lidocaine"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setEditingIndex(null);
                setFormData({
                  code: "",
                  description: "",
                  tooth: "",
                  duration: "",
                  anesthesia: "",
                  notes: "",
                });
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!formData.code}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingIndex !== null ? "Update" : "Add"} Procedure
            </button>
          </div>
        </div>
      )}

      {/* Procedures Table */}
      {procedures.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          No procedures logged. Click "Add Procedure" to add one.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">Code</th>
                <th className="border border-gray-300 p-2 text-left">
                  Description
                </th>
                <th className="border border-gray-300 p-2 text-left">Tooth</th>
                <th className="border border-gray-300 p-2 text-left">
                  Duration
                </th>
                <th className="border border-gray-300 p-2 text-left">
                  Anesthesia
                </th>
                <th className="border border-gray-300 p-2 text-left">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {procedures.map((procedure, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-2 font-mono text-sm">
                    {procedure.code}
                  </td>
                  <td className="border border-gray-300 p-2">
                    {procedure.description}
                  </td>
                  <td className="border border-gray-300 p-2">
                    {procedure.tooth || "-"}
                  </td>
                  <td className="border border-gray-300 p-2">
                    {procedure.duration ? `${procedure.duration} min` : "-"}
                  </td>
                  <td className="border border-gray-300 p-2">
                    {procedure.anesthesia || "-"}
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

export default ProcedureLogger;
