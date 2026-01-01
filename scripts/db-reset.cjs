#!/usr/bin/env node

/**
 * Database Reset Script
 *
 * Completely resets the database by:
 * 1. Dropping the public schema (PostgreSQL only)
 * 2. Running Prisma migrations
 * 3. Seeding with test data
 *
 * ⚠️ DESTRUCTIVE OPERATION
 * This script will DELETE ALL DATA in the database.
 * Only use in preview/development environments.
 *
 * ⚠️ CALLER RESPONSIBILITY
 * This script does NOT check environment variables.
 * The caller (e.g., npm script or build script) is responsible
 * for ensuring this is only run in appropriate environments.
 *
 * Usage:
 *   npm run db:reset        (explicit, for preview/development)
 */

const { execSync } = require('child_process');
const { dropPublicSchema } = require('./drop-public.js');
const { getDatabaseConfig } = require('../lib/database-config.js');

function log(message) {
  console.log(`🔄 [DB Reset] ${message}`);
}

function error(message) {
  console.error(`❌ [DB Reset] ${message}`);
}

async function resetDatabase() {
  log('Starting database reset (DROP + MIGRATE + SEED)...');
  log('⚠️  WARNING: This will DELETE ALL DATA in the database!');

  // Get database configuration with logging
  const config = getDatabaseConfig({ log: true });

  // Safety check: Refuse to reset if this looks like production
  // (Production DBs typically use "prod", "production" in hostname or are non-pooled)
  if (config.DATABASE_URL.includes('prod') && !config.isLocal) {
    error('⛔ SAFETY CHECK FAILED: Database URL contains "prod"');
    error('⛔ This appears to be a production database.');
    error('⛔ Use "npm run db:migrate" instead of "npm run db:reset"');
    process.exit(1);
  }

  // Set environment variables for Prisma CLI
  const prismaEnv = {
    ...process.env,
    DATABASE_URL: config.DATABASE_URL,
    DIRECT_URL: config.DIRECT_URL
  };

  try {
    // Step 1: Drop public schema
    log('Step 1/3: Dropping public schema...');
    await dropPublicSchema();
    log('✅ Public schema dropped');

    // Step 2: Deploy migrations
    log('Step 2/3: Deploying Prisma migrations...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: prismaEnv
    });
    log('✅ Migrations applied');

    // Step 3: Seed database
    log('Step 3/3: Seeding database with test data...');
    execSync('npx prisma db seed', {
      stdio: 'inherit',
      env: prismaEnv
    });
    log('✅ Database seeded');

    log('✅ Database reset completed successfully!');
    log('📊 Database now has fresh schema and seed data');

  } catch (err) {
    error(`Database reset failed: ${err.message}`);
    error('Aborting due to database operation failure');
    process.exit(1);
  }
}

function main() {
  log('Database reset script starting...');

  resetDatabase()
    .then(() => {
      log('Database reset script completed');
    })
    .catch((err) => {
      error(`Unexpected error: ${err.message}`);
      process.exit(1);
    });
}

// Only run if this script is called directly
if (require.main === module) {
  main();
}

module.exports = { resetDatabase };
