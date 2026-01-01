#!/usr/bin/env node

/**
 * Database Migration Script
 *
 * Runs Prisma migrations in production.
 * Wrapper that sets up environment variables before calling Prisma CLI.
 *
 * This is necessary because Prisma CLI reads env vars directly from process.env,
 * so we need to coalesce and set them before invoking Prisma.
 */

const { execSync } = require('child_process');
const { getDatabaseConfig } = require('../lib/database-config.js');

function log(message) {
  console.log(`🔄 [DB Migrate] ${message}`);
}

function error(message) {
  console.error(`❌ [DB Migrate] ${message}`);
}

function runMigrations() {
  log('Running database migrations...');

  try {
    // Get database configuration with logging
    const config = getDatabaseConfig({ log: true });

    // Set environment variables for Prisma CLI
    const prismaEnv = {
      ...process.env,
      DATABASE_URL: config.DATABASE_URL,
      DIRECT_URL: config.DIRECT_URL
    };

    log('Executing: npx prisma migrate deploy');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: prismaEnv
    });

    log('✅ Migrations completed successfully!');

  } catch (err) {
    error(`Migration failed: ${err.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };
