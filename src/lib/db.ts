import { PrismaClient } from "@prisma/client";
import { getDatabaseConfig } from "../../lib/database-config";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Get database configuration
// This centralizes all database URL coalescing logic in one place
const config = getDatabaseConfig();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["warn", "error"],
    datasources: {
      db: {
        url: config.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
