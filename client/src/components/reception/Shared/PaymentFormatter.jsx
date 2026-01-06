/**
 * Centralized payment formatting utility
 * Replaces duplicated payment formatting logic across components
 */

/**
 * Format currency amount
 * @param {number|string|Decimal} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = "USD", locale = "en-US") => {
  if (amount === null || amount === undefined) return "$0.00";

  // Handle Decimal type from Prisma
  let numAmount = 0;
  if (typeof amount === "number") {
    numAmount = amount;
  } else if (
    typeof amount === "object" &&
    typeof amount.toNumber === "function"
  ) {
    numAmount = amount.toNumber();
  } else {
    const parsed = parseFloat(amount);
    numAmount = isNaN(parsed) ? 0 : parsed;
  }

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
  }).format(numAmount);
};

/**
 * Safely convert value to number
 * @param {any} value - Value to convert
 * @returns {number} Converted number or 0
 */
export const toNumber = (value) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "object" && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Format payment status with badge styling
 * @param {string} status - Payment status
 * @returns {object} Status config with label and className
 */
export const formatPaymentStatus = (status) => {
  const statusMap = {
    UNPAID: {
      label: "Unpaid",
      className: "bg-red-100 text-red-800",
    },
    PARTIAL: {
      label: "Partial",
      className: "bg-yellow-100 text-yellow-800",
    },
    PAID: {
      label: "Paid",
      className: "bg-green-100 text-green-800",
    },
    REFUNDED: {
      label: "Refunded",
      className: "bg-gray-100 text-gray-800",
    },
  };

  return (
    statusMap[status] || {
      label: status || "Unknown",
      className: "bg-gray-100 text-gray-800",
    }
  );
};

export default {
  formatCurrency,
  toNumber,
  formatPaymentStatus,
};
