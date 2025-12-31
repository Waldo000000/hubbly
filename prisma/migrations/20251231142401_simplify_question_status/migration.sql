-- Migration: Simplify Question Status
-- Remove answered_live and answered_via_docs statuses, keeping only answered
-- IDEMPOTENT: Can be safely re-run after partial failure

-- Step 1: Update existing questions with removed statuses to 'answered'
-- This is already idempotent
UPDATE "public"."questions"
SET "status" = 'answered'
WHERE "status" IN ('answered_live', 'answered_via_docs');

-- Step 2: Drop the default on status column (required for enum type change)
-- Only drop if default exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attrdef
    WHERE adrelid = 'public.questions'::regclass
    AND adnum = (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.questions'::regclass AND attname = 'status')
  ) THEN
    ALTER TABLE "public"."questions" ALTER COLUMN "status" DROP DEFAULT;
  END IF;
END $$;

-- Step 3: Create new enum type without the removed values
-- Only create if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuestionStatus_new') THEN
    CREATE TYPE "public"."QuestionStatus_new" AS ENUM ('pending', 'approved', 'dismissed', 'answered', 'being_answered');
  END IF;
END $$;

-- Step 4: Alter the questions table to use the new enum
-- Only alter if column is still using old type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_attribute a
    JOIN pg_type t ON a.atttypid = t.oid
    WHERE a.attrelid = 'public.questions'::regclass
    AND a.attname = 'status'
    AND t.typname = 'QuestionStatus'
  ) THEN
    ALTER TABLE "public"."questions" ALTER COLUMN "status" TYPE "public"."QuestionStatus_new" USING "status"::text::"public"."QuestionStatus_new";
  END IF;
END $$;

-- Step 5: Drop the old enum and rename the new one
-- Only if old enum still exists and new enum hasn't been renamed yet
DO $$
BEGIN
  -- Check if old enum exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuestionStatus') THEN
    -- Drop old enum
    DROP TYPE "public"."QuestionStatus";
  END IF;

  -- Check if new enum exists and needs renaming
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'QuestionStatus_new') THEN
    ALTER TYPE "public"."QuestionStatus_new" RENAME TO "QuestionStatus";
  END IF;
END $$;

-- Step 6: Restore the default on status column
-- Only set if no default exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_attrdef
    WHERE adrelid = 'public.questions'::regclass
    AND adnum = (SELECT attnum FROM pg_attribute WHERE attrelid = 'public.questions'::regclass AND attname = 'status')
  ) THEN
    ALTER TABLE "public"."questions" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."QuestionStatus";
  END IF;
END $$;
