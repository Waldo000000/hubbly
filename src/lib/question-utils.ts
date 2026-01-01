/**
 * Question utility functions for validation and business logic
 */

import { isValidParticipantId } from "./participant-id";
import {
  QUESTION_VALIDATION,
  AUTHOR_NAME_MAX_LENGTH,
  QuestionResponse,
} from "@/types/question";

export interface QuestionValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
  }>;
}

/**
 * Validate question submission input
 *
 * @param input - Question submission data
 * @returns Validation result with errors if any
 */
export function validateQuestionInput(input: {
  content: string;
  participantId: string;
  authorName?: string;
}): QuestionValidationResult {
  const errors: Array<{ field: string; message: string }> = [];

  // Validate content
  if (!input.content || input.content.trim().length === 0) {
    errors.push({
      field: "content",
      message: "Question content is required",
    });
  } else if (input.content.trim().length < QUESTION_VALIDATION.minLength) {
    errors.push({
      field: "content",
      message: `Question must be at least ${QUESTION_VALIDATION.minLength} characters`,
    });
  } else if (input.content.trim().length > QUESTION_VALIDATION.maxLength) {
    errors.push({
      field: "content",
      message: `Question cannot exceed ${QUESTION_VALIDATION.maxLength} characters`,
    });
  }

  // Validate participantId
  if (!input.participantId || input.participantId.trim().length === 0) {
    errors.push({
      field: "participantId",
      message: "Participant ID is required",
    });
  } else if (!isValidParticipantId(input.participantId)) {
    errors.push({
      field: "participantId",
      message: "Invalid participant ID format",
    });
  }

  // Validate authorName if provided
  if (input.authorName !== undefined && input.authorName !== null) {
    if (input.authorName.trim().length > AUTHOR_NAME_MAX_LENGTH) {
      errors.push({
        field: "authorName",
        message: `Author name cannot exceed ${AUTHOR_NAME_MAX_LENGTH} characters`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Sort questions with multi-level priority:
 * 1. Primary: Questions with status "being_answered" at top
 * 2. Secondary: Questions with status "answered" at bottom
 * 3. Tertiary: Sort remaining questions by vote count descending (highest votes first)
 * 4. Quaternary: Sort by creation time ascending (older questions first for same votes)
 *
 * This ensures:
 * - Currently being answered question is always at the top
 * - Answered questions are always at the bottom
 * - Popular unanswered questions appear higher in the list
 * - Newly-added questions (0 votes) appear at the bottom of unanswered questions
 *
 * @param questions - Array of questions to sort
 * @returns Sorted array (original array is not modified)
 */
export function sortQuestions<T extends QuestionResponse>(questions: T[]): T[] {
  return [...questions].sort((a, b) => {
    // Primary sort: being_answered always at top
    if (a.status === "being_answered" && b.status !== "being_answered")
      return -1;
    if (b.status === "being_answered" && a.status !== "being_answered")
      return 1;

    // Secondary sort: answered questions always at bottom
    if (a.status === "answered" && b.status !== "answered") return 1;
    if (b.status === "answered" && a.status !== "answered") return -1;

    // Tertiary sort: higher vote count first (for non-answered questions)
    if (b.voteCount !== a.voteCount) {
      return b.voteCount - a.voteCount;
    }

    // Quaternary sort: older questions first (for same vote count, newer at bottom)
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}
