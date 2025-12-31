/**
 * POST /api/questions/[id]/pulse - Submit pulse check feedback on answered question
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  checkRateLimit,
  RATE_LIMITS,
  getRateLimitHeaders,
} from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-utils";
import { isValidParticipantId } from "@/lib/participant-id";
import type { PulseCheckRequest, PulseCheckResponse } from "@/types/question";
import { PulseCheckFeedbackType } from "@prisma/client";

// Valid feedback types
const VALID_FEEDBACK_TYPES: PulseCheckFeedbackType[] = [
  "helpful",
  "neutral",
  "not_helpful",
];

// Valid question statuses for pulse check
const ANSWERED_STATUSES = ["answered"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: questionId } = await params;
    const body = (await req.json()) as PulseCheckRequest;

    // Validate participantId format
    if (!body.participantId || !isValidParticipantId(body.participantId)) {
      return NextResponse.json(
        {
          code: "INVALID_PARTICIPANT_ID",
          message: "Invalid participant ID format",
        },
        { status: 400 },
      );
    }

    // Validate feedback type
    if (!body.feedback || !VALID_FEEDBACK_TYPES.includes(body.feedback)) {
      return NextResponse.json(
        {
          code: "INVALID_FEEDBACK",
          message: `Feedback must be one of: ${VALID_FEEDBACK_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Extract client IP for rate limiting
    const clientIp = getClientIp(req);

    // Check rate limit (IP-based security layer)
    const rateLimitResult = checkRateLimit(
      "pulse-check",
      clientIp,
      RATE_LIMITS.PULSE_CHECK,
    );

    if (!rateLimitResult.allowed) {
      const headers = getRateLimitHeaders(rateLimitResult);
      return NextResponse.json(
        {
          code: "RATE_LIMIT_EXCEEDED",
          message: `Too many pulse check submissions. Please try again in ${rateLimitResult.retryAfter} seconds.`,
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429, headers },
      );
    }

    // Verify question exists and has appropriate status
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      return NextResponse.json(
        {
          code: "QUESTION_NOT_FOUND",
          message: "Question not found",
        },
        { status: 404 },
      );
    }

    if (!ANSWERED_STATUSES.includes(question.status)) {
      return NextResponse.json(
        {
          code: "QUESTION_NOT_ANSWERED",
          message: `Pulse check is only available for answered questions. Question status: ${question.status}`,
        },
        { status: 400 },
      );
    }

    // Check for duplicate feedback
    const existingFeedback = await prisma.pulseCheckFeedback.findUnique({
      where: {
        questionId_participantId: {
          questionId,
          participantId: body.participantId,
        },
      },
    });

    if (existingFeedback) {
      return NextResponse.json(
        {
          code: "ALREADY_SUBMITTED_PULSE_CHECK",
          message:
            "You have already submitted pulse check feedback for this question",
        },
        { status: 409 },
      );
    }

    // Create pulse check feedback
    await prisma.pulseCheckFeedback.create({
      data: {
        questionId,
        participantId: body.participantId,
        feedback: body.feedback,
      },
    });

    const headers = getRateLimitHeaders(rateLimitResult);

    const response: PulseCheckResponse = {
      questionId,
      feedback: body.feedback,
      success: true,
    };

    return NextResponse.json(response, { status: 201, headers });
  } catch (error) {
    console.error("Error submitting pulse check feedback:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An error occurred while submitting pulse check feedback",
      },
      { status: 500 },
    );
  }
}
