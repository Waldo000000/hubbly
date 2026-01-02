-- Enable Row Level Security on Prisma migrations table
-- Purpose: Complete security coverage - secure the Prisma internal migration tracking table
-- Note: postgres role (BYPASSRLS) can still read/write for migration management

ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- No policies are created intentionally!
-- With RLS enabled but no policies:
-- - postgres role (with BYPASSRLS privilege) can manage migrations
-- - All other roles (including anon key) are denied by default
