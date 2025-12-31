-- Migration: Simplify Question Status
-- Remove answered_live and answered_via_docs statuses, keeping only answered

-- Step 1: Update existing questions with removed statuses to 'answered'
UPDATE "public"."questions"
SET "status" = 'answered'
WHERE "status" IN ('answered_live', 'answered_via_docs');

-- Step 2: Create new enum type without the removed values
CREATE TYPE "public"."QuestionStatus_new" AS ENUM ('pending', 'approved', 'dismissed', 'answered', 'being_answered');

-- Step 3: Alter the questions table to use the new enum
ALTER TABLE "public"."questions" ALTER COLUMN "status" TYPE "public"."QuestionStatus_new" USING "status"::text::"public"."QuestionStatus_new";

-- Step 4: Drop the old enum and rename the new one
DROP TYPE "public"."QuestionStatus";
ALTER TYPE "public"."QuestionStatus_new" RENAME TO "QuestionStatus";
