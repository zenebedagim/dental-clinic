const crypto = require("crypto");

/**
 * Generate a random secure token
 * @param {number} length - Length of the token (default: 32)
 * @returns {string} Random token
 */
const generateSecureToken = (length = 32) => {
  return crypto.randomBytes(length).toString("hex");
};

/**
 * Hash a password (for share link passwords)
 * @param {string} password - Plain text password
 * @returns {string} Hashed password
 */
const hashPassword = async (password) => {
  const bcrypt = require("bcryptjs");
  return await bcrypt.hash(password, 10);
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {boolean} True if password matches
 */
const comparePassword = async (password, hash) => {
  const bcrypt = require("bcryptjs");
  return await bcrypt.compare(password, hash);
};

module.exports = {
  generateSecureToken,
  hashPassword,
  comparePassword,
};
