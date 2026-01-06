import { useState } from "react";
import {
  DENTAL_PROCEDURES,
  PROCEDURE_CATEGORIES,
} from "../../../utils/dentalConstants";

const ProcedureLogger = ({ procedures = [], onProceduresChange }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tooth: "",
    duration: "",
    anesthesia: "",
    notes: "",
  });

  const handleAdd = () => {
    // Only update Duration, Anesthesia, and Notes when editing
    if (editingIndex !== null) {
      const updated = [...procedures];
      updated[editingIndex] = {
        ...updated[editingIndex], // Keep existing procedure name, description, and tooth
        duration: formData.duration ? parseInt(formData.duration) : null,
        anesthesia: formData.anesthesia || null,
        notes: formData.notes || null,
      };
      if (onProceduresChange) {
        onProceduresChange(updated);
      }
      setEditingIndex(null);
    }

    // Reset form
    setFormData({
      name: "",
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
      name: procedure.name || "",
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

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Procedures Performed</h3>
        {procedures.length > 0 && (
          <p className="text-sm text-gray-600">
            Click "Edit" on a procedure to add Duration, Anesthesia, and Notes
          </p>
        )}
      </div>

      {/* Edit Form - Only for adding Duration, Anesthesia, and Notes */}
      {showAddForm && editingIndex !== null && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-semibold mb-3">Add Details for Procedure</h4>
          {/* Show Procedure and Tooth info when editing */}
          {editingIndex !== null && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Procedure:</span>{" "}
                  <span className="text-gray-900">
                    {procedures[editingIndex]?.name || "-"}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Tooth:</span>{" "}
                  <span className="text-gray-900">
                    {procedures[editingIndex]?.tooth || "-"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Update Procedure
            </button>
          </div>
        </div>
      )}

      {/* Procedures Table - Shows all information */}
      {procedures.length === 0 ? (
        <p className="text-gray-500 text-center py-4">
          No procedures logged. Select a procedure for a tooth to add one.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 p-2 text-left">
                  Procedure
                </th>
                <th className="border border-gray-300 p-2 text-left">Tooth</th>
                <th className="border border-gray-300 p-2 text-left">
                  Duration
                </th>
                <th className="border border-gray-300 p-2 text-left">
                  Anesthesia
                </th>
                <th className="border border-gray-300 p-2 text-left">Notes</th>
                <th className="border border-gray-300 p-2 text-left">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {procedures.map((procedure, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-gray-300 p-2 font-medium">
                    {procedure.name || procedure.code || "-"}
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
                    {procedure.notes || "-"}
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
