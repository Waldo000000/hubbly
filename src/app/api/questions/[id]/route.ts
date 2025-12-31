/**
 * PATCH /api/questions/[id] - Update question status (host only)
 *
 * Allows authenticated hosts to update the status of questions in their sessions.
 * Valid statuses: being_answered, answered
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type {
  UpdateQuestionStatusRequest,
  UpdateQuestionStatusResponse,
} from "@/types/question";

const VALID_HOST_STATUSES = ["being_answered", "answered"] as const;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: questionId } = await params;

  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          code: "UNAUTHORIZED",
          message: "Authentication required",
        },
        { status: 401 },
      );
    }

    // Parse and validate request body
    let body: UpdateQuestionStatusRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          code: "INVALID_JSON",
          message: "Invalid JSON in request body",
        },
        { status: 400 },
      );
    }

    // Validate status value
    if (
      !body.status ||
      !VALID_HOST_STATUSES.includes(
        body.status as (typeof VALID_HOST_STATUSES)[number],
      )
    ) {
      return NextResponse.json(
        {
          code: "INVALID_STATUS",
          message: `Status must be one of: ${VALID_HOST_STATUSES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Find question and verify it exists
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        qaSession: {
          select: {
            hostId: true,
          },
        },
      },
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

    // Verify user owns the session
    if (question.qaSession.hostId !== session.user.id) {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message: "You are not authorized to update this question",
        },
        { status: 403 },
      );
    }

    // Update question status
    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: {
        status: body.status,
      },
    });

    const response: UpdateQuestionStatusResponse = {
      question: {
        id: updatedQuestion.id,
        sessionId: updatedQuestion.sessionId,
        participantId: updatedQuestion.participantId || undefined,
        authorName: updatedQuestion.authorName || undefined,
        content: updatedQuestion.content,
        voteCount: updatedQuestion.voteCount,
        status: updatedQuestion.status,
        isAnonymous: updatedQuestion.isAnonymous,
        createdAt: updatedQuestion.createdAt.toISOString(),
        updatedAt: updatedQuestion.updatedAt.toISOString(),
      },
      message: "Question status updated successfully",
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error("Error updating question status", error, {
      questionId,
      endpoint: "PATCH /api/questions/[id]",
    });
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An error occurred while updating question status",
      },
      { status: 500 },
    );
  }
}
