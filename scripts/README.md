# Database Reset Scripts

## Overview

Automatic database reset system for Vercel preview deployments. Every preview build gets a completely fresh, seeded database for rapid prototyping.

## How It Works

### Vercel Preview Deployments
1. **Push to branch** → Triggers Vercel preview deployment  
2. **Build starts** → `npm run build:vercel` runs `npm run reset-db`
3. **Database reset** → Drops public schema, runs migrations, seeds data
4. **Fresh environment** → Preview deployment has clean database

### Safety Mechanisms
- **Environment check**: Only runs when `VERCEL_ENV=preview`
- **Local protection**: Skips reset for localhost databases
- **Production protection**: Never runs on production deployments
- **Fail-fast**: Aborts deployment if database reset fails

## Scripts

### `scripts/reset-db.cjs`
Main orchestration script that:
- Checks environment safety
- Calls schema drop script
- Runs Prisma migrations
- Seeds with test data

### `scripts/drop-public.js`
PostgreSQL schema management:
- Drops entire public schema
- Recreates with proper permissions
- Uses direct pg client connection

### `prisma/seed.js`
Test data seeding:
- Creates realistic test users, sessions, questions, votes
- Uses Prisma upsert for idempotency
- Provides consistent development data

## Usage

### Automatic (Recommended)
Just push to any branch - Vercel preview deployments automatically get fresh databases.

### Manual Testing
```bash
# Test locally (will skip for safety)
npm run reset-db

# Force preview environment test
VERCEL_ENV=preview DATABASE_URL="your-test-db-url" npm run reset-db
```

### Configuration

#### Package.json
```json
{
  "scripts": {
    "build:vercel": "npm run reset-db && npx prisma generate && next build",
    "reset-db": "node scripts/reset-db.cjs"
  },
  "prisma": {
    "seed": "node prisma/seed.js"
  }
}
```

#### Environment Variables
- `VERCEL_ENV=preview` - Triggers database reset
- `DATABASE_URL` - Target database connection
- `DIRECT_URL` - Prisma direct connection (optional)

## Benefits

✅ **Zero migration issues** - Every deploy tests full migration sequence  
✅ **Consistent testing** - All previews start with identical seed data  
✅ **Rapid prototyping** - No database state pollution between features  
✅ **Production safety** - Multiple safeguards prevent accidental resets  
✅ **Fast feedback** - Deployment fails fast if database issues exist

## Troubleshooting

### Reset Skipped
If you see "Skipping database reset", check:
- `VERCEL_ENV` is set to `preview`
- `DATABASE_URL` doesn't contain `localhost`
- Database URL is valid and accessible

### Migration Failures
- Verify all migration files are committed to git
- Check DATABASE_URL has proper permissions
- Ensure target database exists and is accessible

### Seed Failures
- Verify `prisma/seed.js` runs locally: `npx prisma db seed`
- Check for constraint violations in test data
- Ensure all referenced models exist after migrations