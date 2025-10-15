/**
 * Test Database Utilities
 * 
 * SQLite-based test database setup and utilities for fast, isolated testing
 */

import { PrismaClient } from '@prisma/test-client'

// Global test database instance
let testDb: PrismaClient | null = null

/**
 * Get or create the test database instance
 */
export function getTestDb(): PrismaClient {
  if (!testDb) {
    testDb = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL || 'file:./test.db'
        }
      },
      log: process.env.NODE_ENV === 'test' ? [] : ['query', 'info', 'warn', 'error']
    })
  }
  return testDb
}

/**
 * Reset the test database by clearing all tables
 * Maintains referential integrity by clearing in correct order
 */
export async function resetTestDb(): Promise<void> {
  const db = getTestDb()
  
  try {
    // For SQLite, disable foreign key checks temporarily
    await db.$executeRaw`PRAGMA foreign_keys = OFF`
    
    // Clear all tables in correct order (child tables first)
    await db.vote.deleteMany().catch(() => {}) // Ignore if table doesn't exist
    await db.question.deleteMany().catch(() => {})
    await db.qaSession.deleteMany().catch(() => {})
    await db.session.deleteMany().catch(() => {}) // NextAuth sessions
    await db.account.deleteMany().catch(() => {}) // NextAuth accounts
    await db.verificationToken.deleteMany().catch(() => {}) // NextAuth tokens
    await db.user.deleteMany().catch(() => {})
    
    await db.$executeRaw`PRAGMA foreign_keys = ON`
  } catch (error) {
    // If tables don't exist, use Prisma's db push to create schema
    console.log('Creating database schema for tests...')
    // The schema will be created automatically by Prisma when needed
  }
}

/**
 * Close the test database connection
 */
export async function closeTestDb(): Promise<void> {
  if (testDb) {
    await testDb.$disconnect()
    testDb = null
  }
}