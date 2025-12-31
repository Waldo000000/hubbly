-- Migration: Simplify Question Status
-- Remove answered_live and answered_via_docs statuses, keeping only answered

-- Step 1: Update existing questions with removed statuses to 'answered'
UPDATE "public"."questions"
SET "status" = 'answered'
WHERE "status" IN ('answered_live', 'answered_via_docs');

-- Step 2: Drop the default on status column (required for enum type change)
ALTER TABLE "public"."questions" ALTER COLUMN "status" DROP DEFAULT;

-- Step 3: Create new enum type without the removed values
CREATE TYPE "public"."QuestionStatus_new" AS ENUM ('pending', 'approved', 'dismissed', 'answered', 'being_answered');

-- Step 4: Alter the questions table to use the new enum
ALTER TABLE "public"."questions" ALTER COLUMN "status" TYPE "public"."QuestionStatus_new" USING "status"::text::"public"."QuestionStatus_new";

-- Step 5: Drop the old enum and rename the new one
DROP TYPE "public"."QuestionStatus";
ALTER TYPE "public"."QuestionStatus_new" RENAME TO "QuestionStatus";

-- Step 6: Restore the default on status column
ALTER TABLE "public"."questions" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."QuestionStatus";
