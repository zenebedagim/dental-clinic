/**
 * Centralized date formatting utility
 * Replaces duplicated date formatting logic across components
 */

/**
 * Format date to readable string
 * @param {string|Date} dateString - Date to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return "N/A";

  const {
    includeTime = false,

    locale = "en-ET",
    dateStyle = "short",
    timeStyle = "short",
  } = options;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";

    if (includeTime) {
      return new Intl.DateTimeFormat(locale, {
        dateStyle,
        timeStyle,
      }).format(date);
    }

    return new Intl.DateTimeFormat(locale, {
      dateStyle,
    }).format(date);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
};

/**
 * Format date and time separately
 * @param {string|Date} dateString - Date to format
 * @param {string} locale - Locale string (default: 'en-ET')
 * @returns {object} Object with date and time strings
 */
export const formatDateTime = (dateString, locale = "en-ET") => {
  if (!dateString) return { date: "N/A", time: "N/A" };

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime()))
      return { date: "Invalid Date", time: "Invalid Date" };

    const dateStr = new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);

    const timeStr = new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);

    return { date: dateStr, time: timeStr };
  } catch (error) {
    console.error("Error formatting date/time:", error);
    return { date: "Invalid Date", time: "Invalid Date" };
  }
};

/**
 * Format relative time (e.g., "2 hours ago", "in 3 days")
 * @param {string|Date} dateString - Date to format
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (dateString) => {
  if (!dateString) return "N/A";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";

    const now = new Date();
    const diffMs = date - now;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (Math.abs(diffSecs) < 60) {
      return diffSecs >= 0 ? "in a few seconds" : "a few seconds ago";
    }
    if (Math.abs(diffMins) < 60) {
      return diffMins >= 0
        ? `in ${diffMins} minute${diffMins !== 1 ? "s" : ""}`
        : `${Math.abs(diffMins)} minute${
            Math.abs(diffMins) !== 1 ? "s" : ""
          } ago`;
    }
    if (Math.abs(diffHours) < 24) {
      return diffHours >= 0
        ? `in ${diffHours} hour${diffHours !== 1 ? "s" : ""}`
        : `${Math.abs(diffHours)} hour${
            Math.abs(diffHours) !== 1 ? "s" : ""
          } ago`;
    }
    if (Math.abs(diffDays) < 7) {
      return diffDays >= 0
        ? `in ${diffDays} day${diffDays !== 1 ? "s" : ""}`
        : `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? "s" : ""} ago`;
    }

    // For longer periods, use absolute date
    return formatDate(dateString);
  } catch (error) {
    console.error("Error formatting relative time:", error);
    return "Invalid Date";
  }
};

/**
 * Check if date is today
 * @param {string|Date} dateString - Date to check
 * @returns {boolean} True if date is today
 */
export const isToday = (dateString) => {
  if (!dateString) return false;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;

    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  } catch {
    return false;
  }
};

/**
 * Check if date is in the past
 * @param {string|Date} dateString - Date to check
 * @returns {boolean} True if date is in the past
 */
export const isPast = (dateString) => {
  if (!dateString) return false;

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return false;

    return date < new Date();
  } catch {
    return false;
  }
};

export default {
  formatDate,
  formatDateTime,
  formatRelativeTime,
  isToday,
  isPast,
};
