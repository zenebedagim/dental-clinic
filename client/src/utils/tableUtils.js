/**
 * Table Utility Functions
 * Helper functions for sorting, filtering, and formatting table data
 */

/**
 * Sort array of objects by a column key
 * @param {Array} data - Array of objects to sort
 * @param {string} columnKey - Key to sort by
 * @param {string} direction - 'asc' or 'desc'
 * @returns {Array} Sorted array
 */
export const sortData = (data, columnKey, direction = "asc") => {
  if (!data || !Array.isArray(data)) return [];

  const sorted = [...data].sort((a, b) => {
    let aVal = a[columnKey];
    let bVal = b[columnKey];

    // Handle nested properties (e.g., 'patient.name')
    if (columnKey.includes(".")) {
      const keys = columnKey.split(".");
      aVal = keys.reduce((obj, key) => obj?.[key], a);
      bVal = keys.reduce((obj, key) => obj?.[key], b);
    }

    // Handle null/undefined values
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    // Handle dates
    if (
      aVal instanceof Date ||
      (typeof aVal === "string" && !isNaN(Date.parse(aVal)))
    ) {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    // Handle numbers
    if (typeof aVal === "number" && typeof bVal === "number") {
      return direction === "asc" ? aVal - bVal : bVal - aVal;
    }

    // Handle strings
    const aStr = String(aVal).toLowerCase();
    const bStr = String(bVal).toLowerCase();

    if (aStr < bStr) return direction === "asc" ? -1 : 1;
    if (aStr > bStr) return direction === "asc" ? 1 : -1;
    return 0;
  });

  return sorted;
};

/**
 * Filter array of objects by search term across multiple fields
 * @param {Array} data - Array of objects to filter
 * @param {string} searchTerm - Search term
 * @param {Array<string>} fields - Array of field names to search in
 * @returns {Array} Filtered array
 */
export const filterData = (data, searchTerm, fields = []) => {
  if (!data || !Array.isArray(data)) return [];
  if (!searchTerm || searchTerm.trim() === "") return data;

  const term = searchTerm.toLowerCase().trim();

  return data.filter((item) => {
    // If no fields specified, search in all string values
    if (fields.length === 0) {
      return Object.values(item).some((value) => {
        if (value == null) return false;
        return String(value).toLowerCase().includes(term);
      });
    }

    // Search in specified fields
    return fields.some((field) => {
      let value = item[field];

      // Handle nested properties
      if (field.includes(".")) {
        const keys = field.split(".");
        value = keys.reduce((obj, key) => obj?.[key], item);
      }

      if (value == null) return false;
      return String(value).toLowerCase().includes(term);
    });
  });
};

/**
 * Format date for display
 * @param {string|Date} date - Date to format
 * @param {string} format - Format type ('short', 'long', 'datetime')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, format = "short") => {
  if (!date) return "N/A";

  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return "Invalid Date";

    const options = {
      short: {
        year: "numeric",
        month: "short",
        day: "numeric",
      },
      long: {
        year: "numeric",
        month: "long",
        day: "numeric",
      },
      datetime: {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    };

    return dateObj.toLocaleDateString(
      "en-US",
      options[format] || options.short
    );
  } catch {
    return "Invalid Date";
  }
};

/**
 * Format currency for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = "USD") => {
  if (amount == null || isNaN(amount)) return "$0.00";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount);
};

/**
 * Paginate array of data
 * @param {Array} data - Array to paginate
 * @param {number} page - Current page (1-indexed)
 * @param {number} pageSize - Items per page
 * @returns {Object} { paginatedData, totalPages, currentPage, totalItems }
 */
export const paginateData = (data, page = 1, pageSize = 10) => {
  if (!data || !Array.isArray(data)) {
    return {
      paginatedData: [],
      totalPages: 0,
      currentPage: 1,
      totalItems: 0,
    };
  }

  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = data.slice(startIndex, endIndex);

  return {
    paginatedData,
    totalPages,
    currentPage,
    totalItems,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
};

/**
 * Get unique values from an array for filter dropdowns
 * @param {Array} data - Array of objects
 * @param {string} field - Field name to extract unique values from
 * @returns {Array} Array of unique values
 */
export const getUniqueValues = (data, field) => {
  if (!data || !Array.isArray(data)) return [];

  const values = data
    .map((item) => {
      let value = item[field];
      if (field.includes(".")) {
        const keys = field.split(".");
        value = keys.reduce((obj, key) => obj?.[key], item);
      }
      return value;
    })
    .filter((value) => value != null && value !== "");

  return [...new Set(values)].sort();
};

/**
 * Combine multiple filter functions
 * @param {Array} data - Data to filter
 * @param {Array<Function>} filters - Array of filter functions
 * @returns {Array} Filtered data
 */
export const applyFilters = (data, filters = []) => {
  if (!data || !Array.isArray(data)) return [];
  if (!filters || filters.length === 0) return data;

  return filters.reduce((filteredData, filterFn) => {
    if (typeof filterFn === "function") {
      return filteredData.filter(filterFn);
    }
    return filteredData;
  }, data);
};
