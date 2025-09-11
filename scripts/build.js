#!/usr/bin/env node

// Set environment variables for Prisma build process
process.env.DATABASE_URL = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL;
process.env.DIRECT_URL = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.DIRECT_URL;

const { execSync } = require('child_process');

try {
  // Run Prisma setup
  execSync('prisma generate', { stdio: 'inherit' });
  execSync('prisma migrate deploy', { stdio: 'inherit' });
  
  console.log('🚀 Building Next.js...');
  execSync('next build', { stdio: 'inherit' });
  
  console.log('✅ Build completed successfully!');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}