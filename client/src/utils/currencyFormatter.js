/**
 * Configurable currency formatter
 * Replaces hardcoded USD currency formatting
 */

// Get currency from config or localStorage
const getCurrency = () => {
  // Check localStorage first (user preference)
  const savedCurrency = localStorage.getItem("currency");
  if (savedCurrency) {
    return savedCurrency;
  }

  // Check environment variable
  const envCurrency = import.meta.env.VITE_CURRENCY;
  if (envCurrency) {
    return envCurrency;
  }

  // Default to USD
  return "USD";
};

// Get locale from config or localStorage
const getLocale = () => {
  const savedLocale = localStorage.getItem("locale");
  if (savedLocale) {
    return savedLocale;
  }

  const envLocale = import.meta.env.VITE_LOCALE;
  if (envLocale) {
    return envLocale;
  }

  return "en-US";
};

/**
 * Format currency amount
 * @param {number|string|Decimal} amount - Amount to format
 * @param {object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (
  amount,
  options = {}
) => {
  const {
    currency = getCurrency(),
    locale = getLocale(),
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  if (amount === null || amount === undefined) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(0);
  }

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
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(numAmount);
};

/**
 * Get currency symbol
 * @param {string} currency - Currency code
 * @returns {string} Currency symbol
 */
export const getCurrencySymbol = (currency = getCurrency()) => {
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(0)
    .replace(/\d/g, "")
    .trim();
};

/**
 * Set user's preferred currency
 * @param {string} currency - Currency code
 */
export const setCurrency = (currency) => {
  localStorage.setItem("currency", currency);
};

/**
 * Set user's preferred locale
 * @param {string} locale - Locale string
 */
export const setLocale = (locale) => {
  localStorage.setItem("locale", locale);
};

export default {
  formatCurrency,
  getCurrencySymbol,
  setCurrency,
  setLocale,
  getCurrency,
  getLocale,
};

