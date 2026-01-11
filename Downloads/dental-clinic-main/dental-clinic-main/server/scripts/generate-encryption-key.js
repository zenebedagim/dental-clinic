/**
 * Generate Encryption Key for Admin Password Visibility
 * 
 * This script generates a secure 32-byte (256-bit) encryption key
 * for AES-256-GCM encryption of passwords for admin visibility.
 * 
 * Usage:
 *   node scripts/generate-encryption-key.js
 * 
 * Add the output to your .env file:
 *   ADMIN_PASSWORD_ENCRYPTION_KEY=<generated_key>
 */

const crypto = require("crypto");

// Generate a secure 32-byte (256-bit) key
const encryptionKey = crypto.randomBytes(32).toString("hex");

console.log("=".repeat(70));
console.log("Admin Password Encryption Key Generator");
console.log("=".repeat(70));
console.log();
console.log("Generated 32-byte (256-bit) encryption key:");
console.log();
console.log(encryptionKey);
console.log();
console.log("=".repeat(70));
console.log();
console.log("Add this to your .env file:");
console.log();
console.log(`ADMIN_PASSWORD_ENCRYPTION_KEY=${encryptionKey}`);
console.log();
console.log("⚠️  IMPORTANT:");
console.log("   - Keep this key secure and do not share it");
console.log("   - Use the same key across all server instances");
console.log("   - Store this key securely (consider using a secret manager)");
console.log("   - If you lose this key, existing encrypted passwords cannot be decrypted");
console.log();
console.log("=".repeat(70));

