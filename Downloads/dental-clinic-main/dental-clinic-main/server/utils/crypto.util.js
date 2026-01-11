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

/**
 * Get or generate encryption key for admin password visibility
 * Uses ADMIN_PASSWORD_ENCRYPTION_KEY from environment or generates a new one
 * @returns {Buffer} Encryption key (32 bytes for AES-256)
 */
const getEncryptionKey = () => {
  const keyFromEnv = process.env.ADMIN_PASSWORD_ENCRYPTION_KEY;
  
  if (keyFromEnv) {
    // If key is hex string, convert to buffer, otherwise hash it
    if (/^[0-9a-fA-F]{64}$/.test(keyFromEnv)) {
      return Buffer.from(keyFromEnv, "hex");
    }
    // If key is provided but not hex, create a consistent hash from it
    return crypto.createHash("sha256").update(keyFromEnv).digest();
  }
  
  // If no key in env, generate a warning and use a default (NOT RECOMMENDED FOR PRODUCTION)
  console.warn(
    "WARNING: ADMIN_PASSWORD_ENCRYPTION_KEY not set. Using a default key. " +
    "This should be set in production environment!"
  );
  // Generate a deterministic key from a default seed (DO NOT USE IN PRODUCTION)
  return crypto.createHash("sha256").update("DEFAULT_KEY_CHANGE_IN_PRODUCTION").digest();
};

/**
 * Encrypt password with AES-256-GCM for admin visibility
 * @param {string} plaintext - Plain text password to encrypt
 * @param {Buffer} key - Optional encryption key (defaults to env key)
 * @returns {string} Encrypted password in format: iv:authTag:encryptedData (all base64)
 */
const encryptPassword = (plaintext, key = null) => {
  if (!plaintext) {
    return null;
  }
  
  const encryptionKey = key || getEncryptionKey();
  const iv = crypto.randomBytes(16); // Initialization vector
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  
  let encrypted = cipher.update(plaintext, "utf8", "base64");
  encrypted += cipher.final("base64");
  const authTag = cipher.getAuthTag();
  
  // Return format: iv:authTag:encryptedData (all base64 encoded)
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
};

/**
 * Decrypt password from AES-256-GCM encrypted format for admin view
 * @param {string} encrypted - Encrypted password in format: iv:authTag:encryptedData
 * @param {Buffer} key - Optional decryption key (defaults to env key)
 * @returns {string} Decrypted plain text password
 */
const decryptPassword = (encrypted, key = null) => {
  if (!encrypted) {
    return null;
  }
  
  try {
    const encryptionKey = key || getEncryptionKey();
    const parts = encrypted.split(":");
    
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted password format");
    }
    
    const iv = Buffer.from(parts[0], "base64");
    const authTag = Buffer.from(parts[1], "base64");
    const encryptedData = parts[2];
    
    const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, "base64", "utf8");
    decrypted += decipher.final("utf8");
    
    return decrypted;
  } catch (error) {
    console.error("Error decrypting password:", error);
    return null;
  }
};

module.exports = {
  generateSecureToken,
  hashPassword,
  comparePassword,
  encryptPassword,
  decryptPassword,
  getEncryptionKey,
};
