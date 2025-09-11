/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Map Supabase environment variables to standard Prisma variables
    DATABASE_URL: process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL,
    DIRECT_URL: process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.DIRECT_URL,
  },
}

module.exports = nextConfig