require("dotenv").config();

const { PrismaClient } = require("@prisma/client");

// Optimize Prisma for serverless environments (Vercel)
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool optimization for serverless
  // These settings help with connection pooling in serverless environments
  ...(process.env.VERCEL === "1" && {
    // Optimize for serverless: reduce connection timeout, enable connection pooling
    __internal: {
      engine: {
        connectTimeout: 10000, // 10 seconds
      },
    },
  }),
});

// Handle graceful shutdown for serverless
if (process.env.VERCEL !== "1") {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}

module.exports = prisma;
