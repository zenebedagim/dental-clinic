/**
 * Add JWT_SECRET and ADMIN_PASSWORD_ENCRYPTION_KEY to .env file
 * 
 * This script reads the existing .env file, adds the required keys if they don't exist,
 * and writes the updated content back to the file.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const envPath = path.join(__dirname, "..", ".env");

// Generate secure keys
const generateJWTSecret = () => {
  return crypto.randomBytes(64).toString("hex");
};

const generateEncryptionKey = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Read existing .env file if it exists
let envContent = "";
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, "utf8");
} else {
  console.log("⚠️  .env file not found. Creating new .env file...");
}

// Parse existing keys
const lines = envContent.split("\n");
const existingKeys = new Set();
const updatedLines = [];

lines.forEach((line) => {
  const trimmedLine = line.trim();
  if (trimmedLine && !trimmedLine.startsWith("#")) {
    const keyMatch = trimmedLine.match(/^([^=]+)=/);
    if (keyMatch) {
      existingKeys.add(keyMatch[1].trim());
    }
  }
  updatedLines.push(line);
});

// Generate new keys if they don't exist
let jwtSecret = null;
let encryptionKey = null;
let keysAdded = false;

// Check for JWT_SECRET
if (!existingKeys.has("JWT_SECRET")) {
  jwtSecret = generateJWTSecret();
  console.log("✅ Generated new JWT_SECRET");
  keysAdded = true;
} else {
  // Extract existing JWT_SECRET
  const jwtLine = lines.find((line) => line.trim().startsWith("JWT_SECRET="));
  if (jwtLine) {
    jwtSecret = jwtLine.split("=")[1]?.trim();
    console.log("✅ JWT_SECRET already exists in .env");
  } else {
    jwtSecret = generateJWTSecret();
    console.log("✅ Generated new JWT_SECRET");
    keysAdded = true;
  }
}

// Check for ADMIN_PASSWORD_ENCRYPTION_KEY
if (!existingKeys.has("ADMIN_PASSWORD_ENCRYPTION_KEY")) {
  encryptionKey = generateEncryptionKey();
  console.log("✅ Generated new ADMIN_PASSWORD_ENCRYPTION_KEY");
  keysAdded = true;
} else {
  // Extract existing ADMIN_PASSWORD_ENCRYPTION_KEY
  const keyLine = lines.find((line) =>
    line.trim().startsWith("ADMIN_PASSWORD_ENCRYPTION_KEY=")
  );
  if (keyLine) {
    encryptionKey = keyLine.split("=")[1]?.trim();
    console.log("✅ ADMIN_PASSWORD_ENCRYPTION_KEY already exists in .env");
  } else {
    encryptionKey = generateEncryptionKey();
    console.log("✅ Generated new ADMIN_PASSWORD_ENCRYPTION_KEY");
    keysAdded = true;
  }
}

// Add keys to .env content
if (keysAdded || !fs.existsSync(envPath)) {
  // Remove trailing newlines
  while (
    updatedLines.length > 0 &&
    updatedLines[updatedLines.length - 1].trim() === ""
  ) {
    updatedLines.pop();
  }

  // Add blank line if file is not empty
  if (updatedLines.length > 0 && updatedLines[updatedLines.length - 1].trim() !== "") {
    updatedLines.push("");
  }

  // Add keys section if adding new keys
  if (keysAdded) {
    updatedLines.push("# Authentication and Encryption Keys");
    updatedLines.push("# Generated automatically - keep these keys secure!");
    updatedLines.push("");
  }

  // Add JWT_SECRET if it's new or missing
  if (!existingKeys.has("JWT_SECRET")) {
    updatedLines.push(`JWT_SECRET=${jwtSecret}`);
  }

  // Add ADMIN_PASSWORD_ENCRYPTION_KEY if it's new or missing
  if (!existingKeys.has("ADMIN_PASSWORD_ENCRYPTION_KEY")) {
    updatedLines.push(`ADMIN_PASSWORD_ENCRYPTION_KEY=${encryptionKey}`);
  }

  // Write updated content to .env file
  fs.writeFileSync(envPath, updatedLines.join("\n"), "utf8");

  console.log("\n" + "=".repeat(70));
  console.log("✅ .env file updated successfully!");
  console.log("=".repeat(70));
  
  if (keysAdded) {
    console.log("\n📋 New keys added to .env:");
    if (!existingKeys.has("JWT_SECRET")) {
      console.log(`   JWT_SECRET=${jwtSecret}`);
    }
    if (!existingKeys.has("ADMIN_PASSWORD_ENCRYPTION_KEY")) {
      console.log(`   ADMIN_PASSWORD_ENCRYPTION_KEY=${encryptionKey}`);
    }
  } else {
    console.log("\n✅ All required keys already exist in .env file");
  }
  
  console.log("\n⚠️  IMPORTANT:");
  console.log("   - Keep these keys secure and do not share them");
  console.log("   - Never commit .env file to version control");
  console.log("   - If you lose ADMIN_PASSWORD_ENCRYPTION_KEY, encrypted passwords cannot be decrypted");
  console.log("=".repeat(70));
} else {
  console.log("\n✅ All required keys already exist in .env file");
  console.log("   JWT_SECRET: Already present");
  console.log("   ADMIN_PASSWORD_ENCRYPTION_KEY: Already present");
}

