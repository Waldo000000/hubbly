import { QaSession, User, Question } from "@prisma/client";

// Base types from Prisma
export type UserEntity = User;
export type SessionEntity = QaSession & {
  host: User;
  questions: Question[];
};

// API request/response types
export interface CreateSessionRequest {
  title: string;
  description?: string;
}

export interface CreateSessionResponse {
  session: {
    id: string;
    title: string;
    description?: string;
    code: string;
    hostId: string;
    isActive: boolean;
    isAcceptingQuestions: boolean;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
  };
}

export interface GetSessionResponse {
  session: {
    id: string;
    title: string;
    description?: string;
    code: string;
    hostId: string;
    isActive: boolean;
    isAcceptingQuestions: boolean;
    createdAt: string;
    updatedAt: string;
    expiresAt: string;
    host: {
      id: string;
      name: string | null;
      email: string;
    };
    _count: {
      questions: number;
    };
  };
}

// Validation types
export interface SessionValidation {
  title: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  description: {
    maxLength: number;
  };
}

// Error types
export interface SessionError {
  code:
    | "VALIDATION_ERROR"
    | "DUPLICATE_CODE"
    | "NOT_FOUND"
    | "UNAUTHORIZED"
    | "EXPIRED";
  message: string;
  field?: string;
}
