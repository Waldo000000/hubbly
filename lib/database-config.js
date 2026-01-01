/**
 * Database Configuration Module
 *
 * Platform-agnostic PostgreSQL connection string resolution.
 *
 * Supported environment variables (in priority order):
 *
 * For pooled connections (runtime queries):
 * - POSTGRES_PRISMA_URL (Supabase pooled connection, port 6543)
 * - POSTGRES_URL (Supabase/generic pooled connection)
 * - DATABASE_URL (Standard PostgreSQL connection string)
 *
 * For direct connections (migrations):
 * - POSTGRES_URL_NON_POOLING (Supabase direct connection, port 5432)
 * - POSTGRES_URL (Fallback to pooled)
 * - DATABASE_URL (Fallback to generic)
 * - DIRECT_URL (Standard direct connection)
 *
 * Works with any PostgreSQL provider: Supabase, Railway, Neon, Render, etc.
 */

/**
 * @typedef {Object} DatabaseConfig
 * @property {string} DATABASE_URL - Pooled connection for runtime queries
 * @property {string} DIRECT_URL - Direct connection for migrations
 * @property {boolean} isLocal - Whether database is localhost
 */

/**
 * @typedef {Object} GetDatabaseConfigOptions
 * @property {boolean} [log] - Whether to log configuration (default: false)
 */

/**
 * Masks a PostgreSQL connection string for safe logging.
 * Completely hides the password for security.
 *
 * @param {string|undefined} url - PostgreSQL connection string
 * @returns {string} Masked connection string
 *
 * @example
 * maskUrl('postgres://user:secret123@host:5432/db')
 * // Returns: 'postgres://user:***@host:5432/db'
 *
 * @note If you need to debug password issues, temporarily modify this
 * function to show first char + length: `${password[0]}*** (${password.length} chars)`
 */
function maskUrl(url) {
  if (!url) return 'NOT SET';

  const match = url.match(/:\/\/([^:]+):([^@]+)@(.+)/);
  if (!match) return url; // Not a valid postgres:// URL

  const [, user, , rest] = match;
  return `postgres://${user}:***@${rest}`;
}

/**
 * Resolves database configuration from environment variables.
 * Handles coalescing logic and validation in one place.
 *
 * @param {GetDatabaseConfigOptions} [options={}] - Configuration options
 * @returns {DatabaseConfig} Database configuration object
 *
 * @throws {Error} If no database URL is configured
 *
 * @example
 * const config = getDatabaseConfig({ log: true });
 * console.log(config.DATABASE_URL); // postgres://...
 */
function getDatabaseConfig({ log = false } = {}) {
  // Coalesce DATABASE_URL (pooled connection for runtime queries)
  const DATABASE_URL =
    process.env.POSTGRES_PRISMA_URL ||  // Supabase pooled (preferred)
    process.env.POSTGRES_URL ||          // Supabase pooled (alternative)
    process.env.DATABASE_URL;            // Generic/standard

  // Validate that we have a database URL
  if (!DATABASE_URL) {
    throw new Error(
      'Missing database configuration. Please set one of the following environment variables: ' +
      'POSTGRES_PRISMA_URL, POSTGRES_URL, or DATABASE_URL'
    );
  }

  // Coalesce DIRECT_URL (non-pooled connection for migrations)
  // If no direct URL is specified, fall back to DATABASE_URL
  const DIRECT_URL =
    process.env.POSTGRES_URL_NON_POOLING ||  // Supabase direct (preferred)
    process.env.POSTGRES_URL ||               // Fallback to pooled
    process.env.DIRECT_URL ||                 // Generic/standard
    DATABASE_URL;                             // Ultimate fallback: use same as DATABASE_URL

  // Log configuration if requested
  if (log) {
    console.log('🔍 [DB Config] Database Configuration:');
    console.log('  Environment variables (in priority order):');
    console.log(`    POSTGRES_PRISMA_URL: ${maskUrl(process.env.POSTGRES_PRISMA_URL)}`);
    console.log(`    POSTGRES_URL: ${maskUrl(process.env.POSTGRES_URL)}`);
    console.log(`    DATABASE_URL: ${maskUrl(process.env.DATABASE_URL)}`);
    console.log(`    POSTGRES_URL_NON_POOLING: ${maskUrl(process.env.POSTGRES_URL_NON_POOLING)}`);
    console.log(`    DIRECT_URL: ${maskUrl(process.env.DIRECT_URL)}`);
    console.log('');
    console.log('  Selected configuration:');
    console.log(`    DATABASE_URL (pooled): ${maskUrl(DATABASE_URL)}`);
    console.log(`    DIRECT_URL (non-pooled): ${maskUrl(DIRECT_URL)}`);
  }

  // Detect if this is a local database
  const isLocal = DATABASE_URL.includes('localhost') ||
                  DATABASE_URL.includes('127.0.0.1') ||
                  DATABASE_URL.includes('file:');

  return {
    DATABASE_URL,
    DIRECT_URL,
    isLocal
  };
}

// CommonJS exports for Node.js scripts
module.exports = { getDatabaseConfig, maskUrl };

// ES Module exports for TypeScript/modern imports
if (typeof exports !== 'undefined') {
  exports.getDatabaseConfig = getDatabaseConfig;
  exports.maskUrl = maskUrl;
}
