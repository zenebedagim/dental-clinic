/**
 * Export Utility Functions
 * Functions for exporting table data to CSV, PDF, and printing
 */

/**
 * Export data to CSV file
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Array of column definitions [{key, label}]
 * @param {string} filename - Name of the file to export
 */
export const exportToCSV = (data, columns, filename = "export") => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    alert("No data to export");
    return;
  }

  try {
    // Create header row
    const headers = columns.map((col) => col.label || col.key);
    const headerRow = headers.join(",");

    // Create data rows
    const dataRows = data.map((row) => {
      return columns
        .map((col) => {
          let value = row[col.key];

          // Handle nested properties
          if (col.key.includes(".")) {
            const keys = col.key.split(".");
            value = keys.reduce((obj, key) => obj?.[key], row);
          }

          // Handle null/undefined
          if (value == null) return "";

          // Handle dates
          if (value instanceof Date) {
            value = value.toISOString();
          }

          // Handle objects (convert to string)
          if (typeof value === "object") {
            value = JSON.stringify(value);
          }

          // Escape commas and quotes in CSV
          const stringValue = String(value);
          if (
            stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n")
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }

          return stringValue;
        })
        .join(",");
    });

    // Combine header and data
    const csvContent = [headerRow, ...dataRows].join("\n");

    // Add BOM for UTF-8 (helps with Excel)
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
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error exporting to CSV:", error);
    alert("Failed to export data. Please try again.");
  }
};

/**
 * Print table data
 * @param {string} tableId - ID of the table element to print
 * @param {string} title - Title to display on printed page
 */
export const printTable = (tableId, title = "Table") => {
  try {
    const tableElement = document.getElementById(tableId);
    if (!tableElement) {
      alert("Table not found");
      return;
    }

    // Create print window
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print");
      return;
    }

    // Get table HTML
    const tableHTML = tableElement.outerHTML;

    // Create print document
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            @media print {
              @page {
                margin: 1cm;
              }
              body {
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <p>Printed on: ${new Date().toLocaleString()}</p>
          ${tableHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  } catch (error) {
    console.error("Error printing table:", error);
    alert("Failed to print. Please try again.");
  }
};

/**
 * Export data to PDF (basic implementation)
 * Note: For full PDF export with formatting, consider using jsPDF library
 * This is a simple text-based export
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Array of column definitions
 * @param {string} filename - Name of the file
 */
export const exportToPDF = async (data, columns, filename = "export") => {
  try {
    // Check if jsPDF is available (user needs to install it)
    if (typeof window !== "undefined" && window.jsPDF) {
      const { jsPDF } = window.jsPDF;
      const doc = new jsPDF();

      // Add title
      doc.setFontSize(16);
      doc.text(filename, 14, 20);

      // Add date
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);

      // Add table
      const tableData = data.map((row) =>
        columns.map((col) => {
          let value = row[col.key];
          if (col.key.includes(".")) {
            const keys = col.key.split(".");
            value = keys.reduce((obj, key) => obj?.[key], row);
          }
          return value != null ? String(value) : "";
        })
      );

      const headers = columns.map((col) => col.label || col.key);

      doc.autoTable({
        head: [headers],
        body: tableData,
        startY: 40,
      });

      doc.save(`${filename}_${new Date().toISOString().split("T")[0]}.pdf`);
    } else {
      // Fallback: Use printTable as alternative
      alert(
        "PDF export requires jsPDF library. Using print instead. Install jsPDF for full PDF export support."
      );
      // You could also create a temporary table and print it
      const tempTableId = "temp-export-table";
      const tempTable = document.createElement("table");
      tempTable.id = tempTableId;
      tempTable.className = "min-w-full divide-y divide-gray-200";
      document.body.appendChild(tempTable);
      // Add table content
      printTable(tempTableId, filename);
      setTimeout(() => {
        document.body.removeChild(tempTable);
      }, 1000);
    }
  } catch (error) {
    console.error("Error exporting to PDF:", error);
    alert("Failed to export to PDF. Please try again or use CSV export.");
  }
};

/**
 * Format data for export (convert nested objects to strings)
 * @param {Array} data - Data to format
 * @returns {Array} Formatted data
 */
export const formatDataForExport = (data) => {
  return data.map((row) => {
    const formattedRow = {};
    Object.keys(row).forEach((key) => {
      let value = row[key];
      if (value instanceof Date) {
        value = value.toLocaleString();
      } else if (typeof value === "object" && value !== null) {
        value = JSON.stringify(value);
      } else if (value == null) {
        value = "";
      }
      formattedRow[key] = value;
    });
    return formattedRow;
  });
};
