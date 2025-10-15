import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Use Supabase environment variables with fallbacks
const DATABASE_URL = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL
const DIRECT_URL = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL

// Validate that we have a database URL
if (!DATABASE_URL) {
  throw new Error(
    'Missing database configuration. Please check that one of the following environment variables is set: ' +
    'POSTGRES_PRISMA_URL, POSTGRES_URL, or DATABASE_URL'
  )
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    datasources: {
      db: {
        url: DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma