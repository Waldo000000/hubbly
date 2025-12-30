-- CreateEnum
CREATE TYPE "public"."PulseCheckFeedbackType" AS ENUM ('helpful', 'neutral', 'not_helpful');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."QuestionStatus" ADD VALUE 'being_answered';
ALTER TYPE "public"."QuestionStatus" ADD VALUE 'answered_live';
ALTER TYPE "public"."QuestionStatus" ADD VALUE 'answered_via_docs';

-- CreateTable
CREATE TABLE "public"."pulse_check_feedback" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "feedback" "public"."PulseCheckFeedbackType" NOT NULL,
    "participant_ip" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pulse_check_feedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pulse_check_feedback_question_id_participant_ip_key" ON "public"."pulse_check_feedback"("question_id", "participant_ip");

-- RenameForeignKey
ALTER TABLE "public"."qa_sessions" RENAME CONSTRAINT "sessions_host_id_fkey" TO "qa_sessions_host_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."pulse_check_feedback" ADD CONSTRAINT "pulse_check_feedback_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
