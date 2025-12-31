import {
  Question,
  QuestionStatus,
  PulseCheckFeedbackType,
} from "@prisma/client";

/**
 * Question Entity Types
 */

/** Full question entity with all fields */
export type QuestionEntity = Question;

/** Question status enum values */
export type { QuestionStatus, PulseCheckFeedbackType };

/**
 * API Request Types
 */

/** Submit a new question to a session */
export interface SubmitQuestionRequest {
  /** Question content (1-100000 characters) */
  content: string;
  /** Participant's display name (optional) */
  authorName?: string;
  /** Whether to submit anonymously */
  isAnonymous: boolean;
  /** Participant's UUID (required) */
  participantId: string;
}

/** Vote on a question */
export interface VoteRequest {
  /** Participant's UUID (required) */
  participantId: string;
}

/** Remove vote from a question */
export interface UnvoteRequest {
  /** Participant's UUID (required) */
  participantId: string;
}

/** Submit pulse check feedback on an answered question */
export interface PulseCheckRequest {
  /** Participant's UUID (required) */
  participantId: string;
  /** Feedback type: helpful, neutral, or not_helpful */
  feedback: PulseCheckFeedbackType;
}

/** Update question status (host only) */
export interface UpdateQuestionStatusRequest {
  /** New status (being_answered or answered) */
  status: "being_answered" | "answered";
}

/**
 * API Response Types
 */

/** Pulse check aggregated statistics */
export interface PulseCheckStats {
  helpful: number;
  neutral: number;
  not_helpful: number;
}

/** Question data returned from API */
export interface QuestionResponse {
  id: string;
  sessionId: string;
  participantId?: string;
  authorName?: string;
  content: string;
  voteCount: number;
  status: QuestionStatus;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
  pulseCheckStats?: PulseCheckStats;
}

/** Response after submitting a question */
export interface SubmitQuestionResponse {
  question: QuestionResponse;
  message: string;
}

/** Response for getting all questions in a session */
export interface GetQuestionsResponse {
  questions: QuestionResponse[];
  total: number;
}

/** Response after voting */
export interface VoteResponse {
  questionId: string;
  voteCount: number;
  voted: boolean;
}

/** Response after pulse check submission */
export interface PulseCheckResponse {
  questionId: string;
  feedback: PulseCheckFeedbackType;
  success: boolean;
}

/** Response after updating question status */
export interface UpdateQuestionStatusResponse {
  question: QuestionResponse;
  message: string;
}

/** Host-specific question response (includes all statuses) */
export type HostQuestionResponse = QuestionResponse;

/** Response for host getting all questions in their session */
export interface GetHostQuestionsResponse {
  questions: HostQuestionResponse[];
  total: number;
}

/**
 * Client-Side State Types
 */

/** Extended question data with client-side flags */
export interface QuestionWithClientState extends QuestionResponse {
  /** Has current participant voted on this question? */
  isVotedByMe: boolean;
  /** Has current participant submitted pulse check feedback? */
  hasPulseCheckByMe: boolean;
  /** Is this question created by current participant? */
  isOwnQuestion: boolean;
}

/** Vote state for client-side tracking */
export interface VoteState {
  questionId: string;
  voted: boolean;
  timestamp: Date;
}

/** Pulse check state for client-side tracking */
export interface PulseCheckState {
  questionId: string;
  feedback: PulseCheckFeedbackType;
  timestamp: Date;
}

/**
 * Validation Types
 */

/** Question content validation rules */
export interface QuestionValidation {
  minLength: number;
  maxLength: number;
  required: boolean;
}

/** Validation error */
export interface QuestionValidationError {
  field: "content" | "authorName" | "participantId";
  message: string;
  code:
    | "REQUIRED"
    | "TOO_SHORT"
    | "TOO_LONG"
    | "INVALID_FORMAT"
    | "INVALID_STATUS";
}

/**
 * Error Types
 */

export interface QuestionError {
  code:
    | "VALIDATION_ERROR"
    | "SESSION_NOT_FOUND"
    | "SESSION_INACTIVE"
    | "SESSION_NOT_ACCEPTING_QUESTIONS"
    | "QUESTION_NOT_FOUND"
    | "ALREADY_VOTED"
    | "ALREADY_SUBMITTED_PULSE_CHECK"
    | "RATE_LIMIT_EXCEEDED"
    | "INVALID_PARTICIPANT_ID"
    | "UNAUTHORIZED";
  message: string;
  field?: string;
}

/**
 * Constants
 */

export const QUESTION_VALIDATION: QuestionValidation = {
  minLength: 3,
  maxLength: 500,
  required: true,
};

export const AUTHOR_NAME_MAX_LENGTH = 100;

/** Status display labels for UI */
export const QUESTION_STATUS_LABELS: Record<QuestionStatus, string> = {
  pending: "Pending Review",
  approved: "Approved",
  dismissed: "Dismissed",
  answered: "Answered",
  being_answered: "Being Answered",
};

/** Pulse check emoji mapping */
export const PULSE_CHECK_EMOJIS: Record<PulseCheckFeedbackType, string> = {
  helpful: "💚",
  neutral: "💛",
  not_helpful: "🔴",
};
