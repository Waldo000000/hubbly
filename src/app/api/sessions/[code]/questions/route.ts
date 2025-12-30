/**
 * GET /api/sessions/[code]/questions - Retrieve approved questions
 * POST /api/sessions/[code]/questions - Submit a new question to a Q&A session
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateQuestionInput } from "@/lib/question-utils";
import {
  checkRateLimit,
  RATE_LIMITS,
  getRateLimitHeaders,
} from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-utils";
import { isValidParticipantId } from "@/lib/participant-id";
import type {
  SubmitQuestionRequest,
  SubmitQuestionResponse,
  GetQuestionsResponse,
} from "@/types/question";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const sessionCode = code.toUpperCase();
    const body = (await req.json()) as SubmitQuestionRequest;

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

    // Validate question input
    const validation = validateQuestionInput({
      content: body.content,
      participantId: body.participantId,
      authorName: body.authorName,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          errors: validation.errors,
        },
        { status: 400 },
      );
    }

    // Extract client IP for rate limiting
    const clientIp = getClientIp(req);

    // Check rate limit (IP-based security layer)
    const rateLimitResult = checkRateLimit(
      "submit-question",
      clientIp,
      RATE_LIMITS.SUBMIT_QUESTION,
    );

    if (!rateLimitResult.allowed) {
      const headers = getRateLimitHeaders(rateLimitResult);
      return NextResponse.json(
        {
          code: "RATE_LIMIT_EXCEEDED",
          message: `Too many questions submitted. Please try again in ${rateLimitResult.retryAfter} seconds.`,
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429, headers },
      );
    }

    // Verify session exists and is accepting questions
    const session = await prisma.qaSession.findUnique({
      where: { code: sessionCode },
    });

    if (!session) {
      return NextResponse.json(
        {
          code: "SESSION_NOT_FOUND",
          message: "Session not found",
        },
        { status: 404 },
      );
    }

    if (!session.isActive) {
      return NextResponse.json(
        {
          code: "SESSION_INACTIVE",
          message: "This session is no longer active",
        },
        { status: 403 },
      );
    }

    if (!session.isAcceptingQuestions) {
      return NextResponse.json(
        {
          code: "SESSION_NOT_ACCEPTING_QUESTIONS",
          message: "This session is not currently accepting questions",
        },
        { status: 403 },
      );
    }

    // Create question with pending status
    const question = await prisma.question.create({
      data: {
        sessionId: session.id,
        participantId: body.participantId,
        content: body.content.trim(),
        authorName: body.authorName?.trim() || null,
        isAnonymous: body.isAnonymous,
        status: "pending",
        voteCount: 0,
      },
    });

    // Return success response with rate limit headers
    const headers = getRateLimitHeaders(rateLimitResult);

    const response: SubmitQuestionResponse = {
      question: {
        id: question.id,
        sessionId: question.sessionId,
        participantId: question.participantId || undefined,
        authorName: question.authorName || undefined,
        content: question.content,
        voteCount: question.voteCount,
        status: question.status,
        isAnonymous: question.isAnonymous,
        createdAt: question.createdAt.toISOString(),
        updatedAt: question.updatedAt.toISOString(),
      },
      message: "Question submitted successfully",
    };

    return NextResponse.json(response, { status: 201, headers });
  } catch (error) {
    console.error("Error submitting question:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An error occurred while submitting the question",
      },
      { status: 500 },
    );
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const sessionCode = code.toUpperCase();

    // Verify session exists
    const session = await prisma.qaSession.findUnique({
      where: { code: sessionCode },
    });

    if (!session) {
      return NextResponse.json(
        {
          code: "SESSION_NOT_FOUND",
          message: "Session not found",
        },
        { status: 404 },
      );
    }

    // Retrieve approved questions sorted by vote count (desc) and creation date (desc)
    const questions = await prisma.question.findMany({
      where: {
        sessionId: session.id,
        status: "approved",
      },
      orderBy: [{ voteCount: "desc" }, { createdAt: "desc" }],
    });

    const response: GetQuestionsResponse = {
      questions: questions.map((q) => ({
        id: q.id,
        sessionId: q.sessionId,
        participantId: q.participantId || undefined,
        authorName: q.authorName || undefined,
        content: q.content,
        voteCount: q.voteCount,
        status: q.status,
        isAnonymous: q.isAnonymous,
        createdAt: q.createdAt.toISOString(),
        updatedAt: q.updatedAt.toISOString(),
      })),
      total: questions.length,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error retrieving questions:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An error occurred while retrieving questions",
      },
      { status: 500 },
    );
  }
}
