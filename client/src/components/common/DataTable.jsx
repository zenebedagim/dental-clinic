import { useState, useMemo } from "react";
import { sortData, filterData, paginateData } from "../../utils/tableUtils";
import { exportToCSV, printTable, exportToPDF } from "../../utils/exportUtils";

/**
 * Reusable DataTable Component
 * Features: Sorting, Filtering, Pagination, Export, Print
 */
const DataTable = ({
  data = [],
  columns = [],
  searchable = true,
  sortable = true,
  pagination = true,
  pageSize = 10,
  exportable = true,
  printable = true,
  onRowClick,
  actions = [],
  title = "Data Table",
  emptyMessage = "No data available",
  className = "",
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState(null);
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState([]);

  // Get searchable fields from columns
  const searchFields = useMemo(() => {
    return columns
      .filter((col) => col.searchable !== false)
      .map((col) => col.key);
  }, [columns]);

  // Filter data
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    return filterData(data, searchTerm, searchFields);
  }, [data, searchTerm, searchFields]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    return sortData(filteredData, sortColumn, sortDirection);
  }, [filteredData, sortColumn, sortDirection]);

  // Paginate data
  const paginationResult = useMemo(() => {
    if (!pagination) {
      return {
        paginatedData: sortedData,
        totalPages: 1,
        currentPage: 1,
        totalItems: sortedData.length,
        hasNextPage: false,
        hasPrevPage: false,
      };
    }
    return paginateData(sortedData, currentPage, pageSize);
  }, [sortedData, currentPage, pageSize, pagination]);

  const { paginatedData, totalPages, totalItems, hasNextPage, hasPrevPage } =
    paginationResult;

  // Handle column sort
  const handleSort = (columnKey) => {
    if (!sortable) return;

    if (sortColumn === columnKey) {
      // Toggle direction
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
    setCurrentPage(1); // Reset to first page on sort
  };

  // Handle export
  const handleExport = (format) => {
    const exportData = sortedData; // Export all filtered/sorted data, not just current page
    const exportColumns = columns.filter((col) => col.exportable !== false);

    if (format === "csv") {
      exportToCSV(exportData, exportColumns, title);
    } else if (format === "pdf") {
      exportToPDF(exportData, exportColumns, title);
    }
  };

  // Handle print
  const handlePrint = () => {
    const tableId = `datatable-${Date.now()}`;
    const tableElement = document.getElementById(tableId);
    if (tableElement) {
      printTable(tableId, title);
    } else {
      // Create temporary table for printing
      setTimeout(() => {
        const tempTable = document.getElementById(tableId);
        if (tempTable) {
          printTable(tableId, title);
        }
      }, 100);
    }
  };

  // Handle row selection
  const handleRowSelect = (rowId, checked) => {
    if (checked) {
      setSelectedRows([...selectedRows, rowId]);
    } else {
      setSelectedRows(selectedRows.filter((id) => id !== rowId));
    }
  };

  // Handle select all
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedRows(paginatedData.map((row) => row.id));
    } else {
      setSelectedRows([]);
    }
  };

  // Get sort icon
  const getSortIcon = (columnKey) => {
    if (sortColumn !== columnKey) {
      return (
        <span className="text-gray-400 ml-1">
          <svg
            className="w-4 h-4 inline"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg>
        </span>
      );
    }
    return (
      <span className="text-indigo-600 ml-1">
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  const tableId = `datatable-${Date.now()}`;

  return (
    <div className={`bg-white rounded-lg shadow-md ${className}`}>
      {/* Header with search and export */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 w-full sm:w-auto">
            {searchable && (
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search..."
                  className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm("");
                      setCurrentPage(1);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {exportable && (
              <>
                <button
                  onClick={() => handleExport("csv")}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 min-h-[44px]"
                  title="Export to CSV"
                >
                  📥 CSV
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 min-h-[44px]"
                  title="Export to PDF"
                >
                  📄 PDF
                </button>
              </>
            )}
            {printable && (
              <button
                onClick={handlePrint}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 min-h-[44px]"
                title="Print table"
              >
                🖨️ Print
              </button>
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="mt-2 text-sm text-gray-600">
          Showing {paginatedData.length} of {totalItems} results
          {searchTerm && ` (filtered)`}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table id={tableId} className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {actions.length > 0 && (
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={
                      paginatedData.length > 0 &&
                      selectedRows.length === paginatedData.length
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  onClick={() =>
                    column.sortable !== false && handleSort(column.key)
                  }
                  className={`px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    column.sortable !== false && sortable
                      ? "cursor-pointer hover:bg-gray-100 select-none"
                      : ""
                  }`}
                >
                  <div className="flex items-center">
                    {column.label}
                    {column.sortable !== false &&
                      sortable &&
                      getSortIcon(column.key)}
                  </div>
                </th>
              ))}
              {actions.length > 0 && (
                <th className="px-3 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions.length > 0 ? 2 : 0)}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr
                  key={row.id || rowIndex}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`${
                    onRowClick ? "cursor-pointer hover:bg-gray-50" : ""
                  } ${selectedRows.includes(row.id) ? "bg-indigo-50" : ""}`}
                >
                  {actions.length > 0 && (
                    <td className="px-3 md:px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(row.id)}
                        onChange={(e) =>
                          handleRowSelect(row.id, e.target.checked)
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                    </td>
                  )}
                  {columns.map((column) => {
                    let cellValue = row[column.key];

                    // Handle nested properties
                    if (column.key.includes(".")) {
                      const keys = column.key.split(".");
                      cellValue = keys.reduce((obj, key) => obj?.[key], row);
                    }

                    // Apply custom render function if provided
                    if (column.render) {
                      cellValue = column.render(cellValue, row);
                    }

                    return (
                      <td
                        key={column.key}
                        className="px-3 md:px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                      >
                        {cellValue != null ? cellValue : "—"}
                      </td>
                    );
                  })}
                  {actions.length > 0 && (
                    <td
                      className="px-3 md:px-6 py-4 whitespace-nowrap text-sm font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center space-x-2">
                        {actions
                          .filter((action) => !action.condition || action.condition(row))
                          .map((action, idx) => (
                            <button
                              key={idx}
                              onClick={() => action.onClick(row)}
                              className={`${
                                action.variant === "danger"
                                  ? "text-red-600 hover:text-red-900"
                                  : action.variant === "primary"
                                  ? "text-indigo-600 hover:text-indigo-900"
                                  : "text-gray-600 hover:text-gray-900"
                              } focus:outline-none focus:underline min-h-[32px] px-2`}
                              title={action.label}
                            >
                              {action.icon || action.label}
                            </button>
                          ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={!hasPrevPage}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={!hasNextPage}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
