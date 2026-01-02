-- Enable Row Level Security on all tables
-- Purpose: Secure database by enabling RLS with zero policies
--          postgres role (BYPASSRLS) continues to work via Prisma
--          anon key access via PostgREST is blocked
-- Note: These commands are idempotent - safe to run multiple times

-- Enable RLS on application tables
ALTER TABLE IF EXISTS "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "qa_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "votes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "pulse_check_feedback" ENABLE ROW LEVEL SECURITY;

-- Enable RLS on NextAuth tables
ALTER TABLE IF EXISTS "accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "verification_tokens" ENABLE ROW LEVEL SECURITY;

-- No policies are created intentionally!
-- With RLS enabled but no policies:
-- - postgres role (with BYPASSRLS privilege) can access everything
-- - All other roles (including anon key) are denied by default
-- This secures the database while keeping Prisma functionality intact
