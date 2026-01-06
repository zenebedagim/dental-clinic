import { useState } from "react";
import { formatDate } from "../../../utils/tableUtils";

const TreatmentHistoryTable = ({
  treatments = [],
  appointments = [],
  onTreatmentSelect = () => {},
}) => {
  const [selectedRow, setSelectedRow] = useState(null);

  // Prioritize treatments array to show all treatments in sequence (1st, 2nd, 3rd, etc.)
  // This ensures we see all treatments per patient, not just appointments
  // If treatments array is empty, fall back to appointments
  const dataToDisplay = treatments.length > 0 ? treatments : appointments;

  const handleRowClick = (item) => {
    setSelectedRow(item.id);
    onTreatmentSelect(item);
  };

  const getXrayStatus = (item) => {
    // Handle both treatment objects (with appointment nested) and appointment objects
    const appointment = item.appointment || item;
    if (!appointment) return null;

    // Check if X-ray result exists and was sent to dentist - always show if sent
    if (appointment.xrayResult && appointment.xrayResult.sentToDentist) {
      return {
        text: "Result Received",
        status: "received",
        color: "text-green-600",
        badge: "bg-green-100 text-green-800",
      };
    }

    // Check if X-ray was requested (has xrayId)
    if (appointment.xrayId) {
      // X-ray result exists but not sent yet
      if (appointment.xrayResult && !appointment.xrayResult.sentToDentist) {
        return {
          text: "Pending Send",
          status: "pending_send",
          color: "text-yellow-600",
          badge: "bg-yellow-100 text-yellow-800",
        };
      }
      // X-ray requested but no result yet
      return {
        text: "Pending",
        status: "pending",
        color: "text-blue-600",
        badge: "bg-blue-100 text-blue-800",
      };
    }

    // No X-ray requested
    return { text: "—", status: "none", color: "text-gray-500" };
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      COMPLETED: "bg-green-100 text-green-800",
      IN_PROGRESS: "bg-blue-100 text-blue-800",
      PENDING: "bg-yellow-100 text-yellow-800",
    };
    return statusMap[status] || "bg-gray-100 text-gray-800";
  };

  const getTreatmentSequence = (item, index) => {
    if (item.treatmentNumber) {
      return item.treatmentNumber;
    }
    if (item.treatmentSequence) {
      return item.treatmentSequence;
    }
    // Fallback to index + 1
    return index + 1;
  };

  const getOrdinalSuffix = (num) => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  if (dataToDisplay.length === 0) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <p className="py-8 text-center text-gray-500">
          No treatment history available
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white rounded-lg shadow-md">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Treatment #
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Date
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Dentist
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Main Diagnosis
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                X-Ray
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dataToDisplay.map((item, index) => {
              // Handle both treatment objects (with appointment nested) and appointment objects
              const treatment = item.treatment || item;
              const appointment = item.appointment || item;
              const sequence = getTreatmentSequence(item, index);
              const xrayStatus = getXrayStatus(item);
              // Always show diagnosis, even if empty
              const diagnosis =
                treatment.diagnosisCode ||
                treatment.diagnosis ||
                treatment.primaryDiagnosis?.name ||
                appointment.diagnosisCode ||
                appointment.diagnosis ||
                "—";

              return (
                <tr
                  key={item.id || index}
                  onClick={() => handleRowClick(item)}
                  className={`cursor-pointer transition-colors ${
                    selectedRow === item.id
                      ? "bg-indigo-50 hover:bg-indigo-100"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-indigo-600">
                        #{sequence}
                      </span>
                      <span className="text-xs text-gray-500">
                        {sequence}
                        {getOrdinalSuffix(sequence)} Treatment
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(
                        appointment.date ||
                          item.date ||
                          treatment.createdAt ||
                          item.createdAt,
                        "short"
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {appointment.dentist?.name || item.dentist?.name || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">{diagnosis}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(
                        treatment.status || item.status
                      )}`}
                    >
                      {treatment.status || item.status || "PENDING"}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {xrayStatus && xrayStatus.badge ? (
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${xrayStatus.badge}`}
                      >
                        {xrayStatus.text}
                      </span>
                    ) : (
                      <span
                        className={`text-xs ${
                          xrayStatus?.color || "text-gray-500"
                        }`}
                      >
                        {xrayStatus?.text || "—"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TreatmentHistoryTable;
