/**
 * CSV Export Utility
 * Converts data arrays to CSV format and triggers download
 */

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} columns - Array of column definitions with key and label
 * @returns {string} CSV string
 */
export const convertToCSV = (data, columns) => {
  if (!data || data.length === 0) {
    return "";
  }

  // Get headers from columns or use object keys
  const headers = columns
    ? columns.map((col) => col.label || col.key)
    : Object.keys(data[0]);

  // Create CSV rows
  const rows = data.map((item) => {
    if (columns) {
      return columns
        .map((col) => {
          const value = getNestedValue(item, col.key);
          // Format value based on render function if provided
          if (col.render && typeof col.render === "function") {
            const rendered = col.render(value, item);
            return escapeCSVValue(rendered);
          }
          return escapeCSVValue(value);
        })
        .join(",");
    } else {
      return Object.values(item)
        .map((value) => escapeCSVValue(value))
        .join(",");
    }
  });

  // Combine headers and rows
  return [headers.join(","), ...rows].join("\n");
};

/**
 * Get nested value from object using dot notation
 * @param {Object} obj - Object to get value from
 * @param {string} path - Dot notation path (e.g., "patient.name")
 * @returns {any} Value at path or empty string
 */
const getNestedValue = (obj, path) => {
  if (!path) return "";
  return path.split(".").reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : "";
  }, obj);
};

/**
 * Escape CSV value (handle commas, quotes, newlines)
 * @param {any} value - Value to escape
 * @returns {string} Escaped CSV value
 */
const escapeCSVValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
};

/**
 * Download CSV file
 * @param {string} csvContent - CSV string content
 * @param {string} filename - Filename for download (without extension)
 */
export const downloadCSV = (csvContent, filename = "export") => {
  // Add BOM for Excel compatibility
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  // Create download link
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `${filename}_${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up
  URL.revokeObjectURL(url);
};

/**
 * Export data to CSV
 * @param {Array} data - Data to export
 * @param {Array} columns - Column definitions
 * @param {string} filename - Filename for download
 */
export const exportToCSV = (data, columns, filename = "export") => {
  try {
    const csvContent = convertToCSV(data, columns);
    if (!csvContent) {
      throw new Error("No data to export");
    }
    downloadCSV(csvContent, filename);
    return true;
  } catch (error) {
    console.error("Error exporting to CSV:", error);
    throw error;
  }
};

/**
 * Export patients to CSV
 * @param {Array} patients - Patient data array
 */
export const exportPatientsToCSV = (patients) => {
  const columns = [
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "gender", label: "Gender" },
    { key: "dateOfBirth", label: "Date of Birth" },
    { key: "cardNo", label: "Card Number" },
    { key: "address", label: "Address" },
    {
      key: "createdAt",
      label: "Date Added",
      render: (value) => (value ? new Date(value).toLocaleDateString() : ""),
    },
  ];

  return exportToCSV(patients, columns, "patients");
};

/**
 * Export appointments to CSV
 * @param {Array} appointments - Appointment data array
 */
export const exportAppointmentsToCSV = (appointments) => {
  const columns = [
    {
      key: "date",
      label: "Date & Time",
      render: (value) => (value ? new Date(value).toLocaleString() : ""),
    },
    { key: "patientName", label: "Patient" },
    { key: "patient.phone", label: "Phone" },
    { key: "dentist.name", label: "Dentist" },
    { key: "status", label: "Status" },
    { key: "visitReason", label: "Reason" },
  ];

  return exportToCSV(appointments, columns, "appointments");
};

/**
 * Export payments to CSV
 * @param {Array} payments - Payment data array
 */
export const exportPaymentsToCSV = (payments) => {
  const columns = [
    {
      key: "paymentDate",
      label: "Date",
      render: (value) => (value ? new Date(value).toLocaleDateString() : ""),
    },
    { key: "patientName", label: "Patient" },
    { key: "patient.phone", label: "Phone" },
    { key: "dentist", label: "Dentist" },
    {
      key: "amount",
      label: "Amount",
      render: (value) => (value ? `$${parseFloat(value).toFixed(2)}` : "$0.00"),
    },
    {
      key: "paidAmount",
      label: "Paid",
      render: (value) => (value ? `$${parseFloat(value).toFixed(2)}` : "$0.00"),
    },
    { key: "paymentStatus", label: "Status" },
    { key: "paymentMethod", label: "Payment Method" },
  ];

  return exportToCSV(payments, columns, "payments");
};
