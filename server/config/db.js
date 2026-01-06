require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL environment variable is not set!");
  console.error("Please set DATABASE_URL in your .env file.");
  console.error("Example: DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require");
  process.exit(1);
}

// Validate DATABASE_URL format
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl.startsWith("postgresql://") && !dbUrl.startsWith("postgres://")) {
  console.error("❌ ERROR: DATABASE_URL must start with 'postgresql://' or 'postgres://'");
  process.exit(1);
}

// Helper function to add/update query parameters in URL
function addQueryParam(url, param, value) {
  const separator = url.includes("?") ? "&" : "?";
  // Check if parameter already exists
  if (url.includes(`${param}=`)) {
    // Replace existing parameter
    return url.replace(new RegExp(`${param}=[^&]*`), `${param}=${value}`);
  }
  return `${url}${separator}${param}=${value}`;
}

// For Neon databases, ensure proper connection string configuration
let connectionString = dbUrl;
let directUrl = dbUrl; // For migrations and direct connections

if (dbUrl.includes("neon.tech")) {
  // For Neon, prefer connection pooling URL if available
  if (process.env.DATABASE_URL_POOLER) {
    connectionString = process.env.DATABASE_URL_POOLER;
    // Ensure SSL is set for pooler URL
    if (!connectionString.includes("sslmode=")) {
      connectionString = addQueryParam(connectionString, "sslmode", "require");
    }
      // Add pgbouncer mode for Neon pooler (important for connection pooling)
      if (!connectionString.includes("pgbouncer=")) {
        connectionString = addQueryParam(connectionString, "pgbouncer", "true");
      }
  } else {
    // If no pooler URL, use direct URL but ensure SSL is configured
    connectionString = dbUrl;
    if (!connectionString.includes("sslmode=")) {
      connectionString = addQueryParam(connectionString, "sslmode", "require");
    }
      // For Neon, add connection_limit and pool_timeout for better connection management
      // Lower limit for serverless to prevent connection exhaustion
    if (!connectionString.includes("connection_limit=")) {
        connectionString = addQueryParam(connectionString, "connection_limit", "5");
      }
      if (!connectionString.includes("pool_timeout=")) {
        connectionString = addQueryParam(connectionString, "pool_timeout", "10");
    }
  }
  
  // Direct URL for migrations (should use non-pooler endpoint)
  // If using pooler for queries, we still need direct URL for migrations
  if (process.env.DATABASE_URL_DIRECT) {
    directUrl = process.env.DATABASE_URL_DIRECT;
  } else {
    // Convert pooler URL to direct URL if needed
    directUrl = dbUrl.replace("-pooler", "").replace(":5432", ":5432");
    if (!directUrl.includes("sslmode=")) {
      directUrl = addQueryParam(directUrl, "sslmode", "require");
    }
  }
}

// Optimize Prisma for serverless environments (Vercel)
// Note: directUrl is only for Prisma Migrate (schema.prisma), not for PrismaClient
// Connection pool settings are managed through connection string parameters, not Prisma config
const prismaConfig = {
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  datasources: {
    db: {
      url: connectionString,
    },
  },
};

// Connection pool optimization for serverless
// Prisma manages connections automatically, but we ensure connection string has proper settings
if (process.env.VERCEL === "1") {
  // For Vercel/serverless, use minimal connections
  if (!connectionString.includes("connection_limit=")) {
    connectionString = addQueryParam(connectionString, "connection_limit", "1");
  }
  prismaConfig.__internal = {
    engine: {
      connectTimeout: 10000, // 10 seconds
    },
  };
}

const prisma = new PrismaClient(prismaConfig);

// Prisma automatically handles connection errors and reconnections
// The "Closed" error usually means:
// 1. Connection was idle too long and server closed it (Prisma will reconnect automatically)
// 2. Connection pool exhausted (ensure connection_limit is set in connection string)
// 3. Network issues (Prisma will retry automatically)

// Log connection errors for debugging
if (process.env.NODE_ENV === "development") {
  prisma.$on("error", (e) => {
    console.error("⚠️ Prisma connection error:", e);
    if (e.message && e.message.includes("Closed")) {
      console.warn("💡 Connection closed - Prisma will automatically reconnect on next query");
    }
  });
}

// Test database connection on startup (only in non-serverless environments)
if (process.env.VERCEL !== "1") {
  // Log connection details in development
  if (process.env.NODE_ENV === "development") {
    console.log("🔍 Database Connection Info:");
    console.log("  - Using connection string:", connectionString.replace(/:[^:@]+@/, ":****@"));
    if (directUrl !== connectionString) {
      console.log("  - Direct URL (for migrations):", directUrl.replace(/:[^:@]+@/, ":****@"));
    }
    console.log("  - Is Neon database:", dbUrl.includes("neon.tech"));
  }
  
  // Test connection asynchronously without blocking
  prisma.$connect()
    .then(() => {
      console.log("✅ Database connection successful");
    })
    .catch((error) => {
      console.error("❌ Database connection failed:");
      console.error("Error:", error.message);
      
      // Extract more details from error
      if (error.message.includes("Can't reach database server")) {
        const hostMatch = error.message.match(/`([^`]+)`/);
        if (hostMatch) {
          console.error(`\n📍 Attempted to connect to: ${hostMatch[1]}`);
        }
      }
      
      // Neon-specific troubleshooting
      if (dbUrl.includes("neon.tech")) {
        console.error("\n🔧 Neon Database Specific Tips:");
        console.error("1. Ensure your DATABASE_URL uses the connection pooling endpoint (ends with -pooler)")
        console.error("2. Or set DATABASE_URL_POOLER with your pooler URL");
        console.error("3. Verify SSL is enabled: connection string should include ?sslmode=require");
        console.error("4. Check if your Neon project is active and not paused");
        console.error("5. Verify your IP is not blocked by Neon's firewall");
        console.error("6. Try using DATABASE_URL_DIRECT for migrations if pooler fails");
      }
      
      console.error("\n💡 General Troubleshooting tips:");
      console.error("1. Check if DATABASE_URL is correct in your .env file");
      console.error("2. Verify your database server is running and accessible");
      console.error("3. Check your network connection and firewall settings");
      console.error("4. Verify your database credentials are correct");
      console.error("5. Test connection with: psql \"$DATABASE_URL\" or using a database client");
      // Don't exit - let the application start and show errors when API is called
    });

  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}

module.exports = prisma;
