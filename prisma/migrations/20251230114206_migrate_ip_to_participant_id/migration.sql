-- AlterTable: Rename voter_ip to participant_id in votes table
ALTER TABLE "votes" RENAME COLUMN "voter_ip" TO "participant_id";

-- AlterTable: Rename participant_ip to participant_id in pulse_check_feedback table
ALTER TABLE "pulse_check_feedback" RENAME COLUMN "participant_ip" TO "participant_id";

-- AlterTable: Add optional participant_id column to questions table
ALTER TABLE "questions" ADD COLUMN "participant_id" TEXT;
