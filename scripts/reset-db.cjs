#!/usr/bin/env node

/**
 * Database Reset Script for Vercel Preview Deployments
 * 
 * Completely resets the database by:
 * 1. Dropping the public schema
 * 2. Running Prisma migrations
 * 3. Seeding with fresh test data
 * 
 * Only runs when VERCEL_ENV=preview to protect production
 */

const { execSync } = require('child_process')
const { dropPublicSchema } = require('./drop-public.js')

function log(message) {
  console.log(`🔄 [DB Reset] ${message}`)
}

function error(message) {
  console.error(`❌ [DB Reset] ${message}`)
}

async function resetDatabase() {
  const vercelEnv = process.env.VERCEL_ENV
  const nodeEnv = process.env.NODE_ENV

  log(`Environment: VERCEL_ENV=${vercelEnv}, NODE_ENV=${nodeEnv}`)

  // Coalesce DATABASE_URL from various sources (matches db.ts pattern)
  const databaseUrl = process.env.POSTGRES_PRISMA_URL ||
                      process.env.POSTGRES_URL ||
                      process.env.DATABASE_URL

  // Check if we have a database URL from any source
  if (!databaseUrl) {
    log('Skipping database operations - no database URL found (checked POSTGRES_PRISMA_URL, POSTGRES_URL, DATABASE_URL)')
    return
  }

  log(`Using database URL from: ${process.env.POSTGRES_PRISMA_URL ? 'POSTGRES_PRISMA_URL' : process.env.POSTGRES_URL ? 'POSTGRES_URL' : 'DATABASE_URL'}`)

  // Check if database URL points to localhost (development)
  const isLocalDB = databaseUrl.includes('localhost') ||
                   databaseUrl.includes('127.0.0.1')

  if (isLocalDB && nodeEnv === 'development') {
    log('Skipping database operations - detected local development database')
    return
  }

  try {
    // PRODUCTION: Only run migrations (no reset, no seed)
    if (vercelEnv === 'production') {
      log('🚀 Running migrations for production deployment...')
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: { ...process.env }
      })
      log('✅ Production migrations applied successfully!')
      return
    }

    // PREVIEW: Full reset with seed data
    if (vercelEnv === 'preview') {
      log('🚀 Starting database reset for preview deployment...')

      // Step 1: Drop public schema
      log('Step 1/3: Dropping public schema...')
      await dropPublicSchema()

      // Step 2: Deploy migrations
      log('Step 2/3: Deploying Prisma migrations...')
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: { ...process.env }
      })

      // Step 3: Seed database
      log('Step 3/3: Seeding database with test data...')
      execSync('npx prisma db seed', {
        stdio: 'inherit',
        env: { ...process.env }
      })

      log('✅ Database reset completed successfully!')
      log('📊 Preview deployment will start with fresh, seeded database')
      return
    }

    // DEVELOPMENT or other: Skip
    log(`Skipping database operations for VERCEL_ENV=${vercelEnv}`)

  } catch (err) {
    error(`Database operation failed: ${err.message}`)

    // In production/preview, fail the build
    if (vercelEnv === 'production' || vercelEnv === 'preview') {
      error(`Aborting ${vercelEnv} deployment due to database operation failure`)
      process.exit(1)
    }

    // In other environments, log but don't fail the build
    error('Continuing build despite database operation failure')
  }
}

function main() {
  log('Database reset script starting...')
  
  resetDatabase().then(() => {
    log('Database reset script completed')
  }).catch((err) => {
    error(`Unexpected error: ${err.message}`)
    process.exit(1)
  })
}

// Only run if this script is called directly
if (require.main === module) {
  main()
}

module.exports = { resetDatabase }