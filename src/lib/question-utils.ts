/**
 * Question utility functions for validation and business logic
 */

import { isValidParticipantId } from "./participant-id";
import { QUESTION_VALIDATION, AUTHOR_NAME_MAX_LENGTH } from "@/types/question";

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
