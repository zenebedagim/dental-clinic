/**
 * Phone number validation utility
 * Validates and formats phone numbers for different countries
 */

/**
 * Phone number patterns by country
 */
const PHONE_PATTERNS = {
  ET: {
    // Ethiopia: 09XXXXXXXX or +2519XXXXXXXX (10 digits starting with 09)
    pattern: /^(?:\+251|0)?9\d{8}$/,
    minLength: 9,
    maxLength: 12,
    format: (digits) => {
      // Remove leading 0 or +251
      let clean = digits.replace(/^\+251|^0/, "");
      // Ensure it starts with 9
      if (!clean.startsWith("9")) {
        clean = "9" + clean.replace(/^9/, "");
      }
      // Format: 09XX XXX XXXX
      if (clean.length === 9) {
        return `0${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5)}`;
      }
      return `0${clean}`;
    },
    error:
      "Ethiopian phone number must be 10 digits starting with 09 (e.g., 0911922363)",
  },
  US: {
    pattern: /^(?:\+1)?[2-9]\d{2}[2-9]\d{2}\d{4}$/,
    minLength: 10,
    maxLength: 11,
    format: (digits) => {
      const clean = digits.replace(/^\+1/, "").slice(-10);
      return `(${clean.slice(0, 3)}) ${clean.slice(3, 6)}-${clean.slice(6)}`;
    },
    error: "US phone number must be 10 digits",
  },
};

/**
 * Get country code from config or default
 */
const getDefaultCountry = () => {
  const savedCountry = localStorage.getItem("phoneCountry");
  if (savedCountry && PHONE_PATTERNS[savedCountry]) {
    return savedCountry;
  }
  const envCountry = import.meta.env.VITE_PHONE_COUNTRY;
  if (envCountry && PHONE_PATTERNS[envCountry]) {
    return envCountry;
  }
  return "ET"; // Default to Ethiopia
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @param {string} country - Country code (default: 'ET' for Ethiopia)
 * @returns {object} Validation result with isValid and formatted phone
 */
export const validatePhone = (phone, country = null) => {
  if (!phone || typeof phone !== "string") {
    return {
      isValid: false,
      formatted: "",
      error: "Phone number is required",
    };
  }

  const countryCode = country || getDefaultCountry();
  const pattern = PHONE_PATTERNS[countryCode];

  if (!pattern) {
    // Fallback to basic validation
    const digitsOnly = phone.replace(/\D/g, "");
    return {
      isValid: digitsOnly.length >= 9,
      formatted: phone,
      error: digitsOnly.length < 9 ? "Phone number is too short" : null,
    };
  }

  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, "");

  // Check if it starts with country code
  let digitsOnly = cleaned.replace(/^\+251|^\+1/, "");

  // Remove leading 0 for Ethiopia
  if (countryCode === "ET" && digitsOnly.startsWith("0")) {
    digitsOnly = digitsOnly.slice(1);
  }

  // Remove leading 1 for US
  if (
    countryCode === "US" &&
    digitsOnly.startsWith("1") &&
    digitsOnly.length === 11
  ) {
    digitsOnly = digitsOnly.slice(1);
  }

  // Validate length
  if (
    digitsOnly.length < pattern.minLength ||
    digitsOnly.length > pattern.maxLength
  ) {
    return {
      isValid: false,
      formatted: phone,
      error: pattern.error,
    };
  }

  // Validate pattern
  const fullNumber =
    countryCode === "ET" && !cleaned.startsWith("+")
      ? `0${digitsOnly}`
      : digitsOnly;

  if (!pattern.pattern.test(fullNumber)) {
    return {
      isValid: false,
      formatted: phone,
      error: pattern.error,
    };
  }

  // Format phone number
  const formatted = pattern.format(digitsOnly);

  return {
    isValid: true,
    formatted,
    error: null,
  };
};

/**
 * Format phone number for display
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
export const formatPhone = (phone) => {
  if (!phone) return "";
  const validation = validatePhone(phone);
  return validation.formatted || phone;
};

/**
 * Check if phone number is valid
 * @param {string} phone - Phone number to check
 * @returns {boolean} True if valid
 */
export const isValidPhone = (phone) => {
  return validatePhone(phone).isValid;
};

export default {
  validatePhone,
  formatPhone,
  isValidPhone,
};
