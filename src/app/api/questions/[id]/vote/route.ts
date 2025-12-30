/**
 * POST /api/questions/[id]/vote - Vote on a question
 * DELETE /api/questions/[id]/vote - Remove vote from a question
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
import type { VoteRequest, VoteResponse } from "@/types/question";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: questionId } = await params;
    const body = (await req.json()) as VoteRequest;

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

    // Extract client IP for rate limiting
    const clientIp = getClientIp(req);

    // Check rate limit (IP-based security layer)
    const rateLimitResult = checkRateLimit("vote", clientIp, RATE_LIMITS.VOTE);

    if (!rateLimitResult.allowed) {
      const headers = getRateLimitHeaders(rateLimitResult);
      return NextResponse.json(
        {
          code: "RATE_LIMIT_EXCEEDED",
          message: `Too many votes. Please try again in ${rateLimitResult.retryAfter} seconds.`,
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429, headers },
      );
    }

    // Verify question exists
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

    // Check for duplicate vote
    const existingVote = await prisma.vote.findUnique({
      where: {
        questionId_participantId: {
          questionId,
          participantId: body.participantId,
        },
      },
    });

    if (existingVote) {
      return NextResponse.json(
        {
          code: "ALREADY_VOTED",
          message: "You have already voted on this question",
        },
        { status: 409 },
      );
    }

    // Create vote and increment vote count in a transaction
    const [, updatedQuestion] = await prisma.$transaction([
      prisma.vote.create({
        data: {
          questionId,
          participantId: body.participantId,
        },
      }),
      prisma.question.update({
        where: { id: questionId },
        data: {
          voteCount: {
            increment: 1,
          },
        },
      }),
    ]);

    const headers = getRateLimitHeaders(rateLimitResult);

    const response: VoteResponse = {
      questionId,
      voteCount: updatedQuestion.voteCount,
      voted: true,
    };

    return NextResponse.json(response, { status: 201, headers });
  } catch (error) {
    console.error("Error voting on question:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An error occurred while voting on the question",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: questionId } = await params;
    const body = (await req.json()) as VoteRequest;

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

    // Extract client IP for rate limiting
    const clientIp = getClientIp(req);

    // Check rate limit (IP-based security layer)
    const rateLimitResult = checkRateLimit("vote", clientIp, RATE_LIMITS.VOTE);

    if (!rateLimitResult.allowed) {
      const headers = getRateLimitHeaders(rateLimitResult);
      return NextResponse.json(
        {
          code: "RATE_LIMIT_EXCEEDED",
          message: `Too many vote operations. Please try again in ${rateLimitResult.retryAfter} seconds.`,
          retryAfter: rateLimitResult.retryAfter,
        },
        { status: 429, headers },
      );
    }

    // Verify question exists
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

    // Check if vote exists
    const existingVote = await prisma.vote.findUnique({
      where: {
        questionId_participantId: {
          questionId,
          participantId: body.participantId,
        },
      },
    });

    if (!existingVote) {
      return NextResponse.json(
        {
          code: "VOTE_NOT_FOUND",
          message: "You have not voted on this question",
        },
        { status: 404 },
      );
    }

    // Delete vote and decrement vote count in a transaction
    const [, updatedQuestion] = await prisma.$transaction([
      prisma.vote.delete({
        where: {
          questionId_participantId: {
            questionId,
            participantId: body.participantId,
          },
        },
      }),
      prisma.question.update({
        where: { id: questionId },
        data: {
          voteCount: {
            decrement: 1,
          },
        },
      }),
    ]);

    const headers = getRateLimitHeaders(rateLimitResult);

    const response: VoteResponse = {
      questionId,
      voteCount: updatedQuestion.voteCount,
      voted: false,
    };

    return NextResponse.json(response, { status: 200, headers });
  } catch (error) {
    console.error("Error removing vote from question:", error);
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An error occurred while removing the vote",
      },
      { status: 500 },
    );
  }
}
