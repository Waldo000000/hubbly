/**
 * GET /api/sessions/[code]/host/questions - Retrieve all questions for a host's session
 *
 * This endpoint allows authenticated hosts to view all questions submitted to their session,
 * regardless of status (pending, approved, dismissed, answered, being_answered).
 * Questions are sorted by vote count (descending) to help hosts prioritize.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { GetHostQuestionsResponse } from "@/types/question";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const sessionCode = code.toUpperCase();

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

    // Verify session exists
    const qaSession = await prisma.qaSession.findUnique({
      where: { code: sessionCode },
    });

    if (!qaSession) {
      return NextResponse.json(
        {
          code: "SESSION_NOT_FOUND",
          message: "Session not found",
        },
        { status: 404 },
      );
    }

    // Verify user is the host of this session
    if (qaSession.hostId !== session.user.id) {
      return NextResponse.json(
        {
          code: "FORBIDDEN",
          message:
            "You are not authorized to access questions for this session",
        },
        { status: 403 },
      );
    }

    // Retrieve all questions for the session (all statuses)
    // Sort by vote count descending (highest votes first), then by creation date
    const questions = await prisma.question.findMany({
      where: {
        sessionId: qaSession.id,
      },
      orderBy: [{ voteCount: "desc" }, { createdAt: "desc" }],
      include: {
        pulseCheckFeedback: {
          select: {
            feedback: true,
          },
        },
      },
    });

    const response: GetHostQuestionsResponse = {
      questions: questions.map((q) => {
        // Calculate pulse check stats for answered questions
        const pulseCheckStats =
          q.status === "answered"
            ? {
                helpful: q.pulseCheckFeedback.filter(
                  (f) => f.feedback === "helpful",
                ).length,
                neutral: q.pulseCheckFeedback.filter(
                  (f) => f.feedback === "neutral",
                ).length,
                not_helpful: q.pulseCheckFeedback.filter(
                  (f) => f.feedback === "not_helpful",
                ).length,
              }
            : undefined;

        return {
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
          pulseCheckStats,
        };
      }),
      total: questions.length,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error("Error retrieving host questions", error, {
      sessionCode: code,
      endpoint: "GET /api/sessions/[code]/host/questions",
    });
    return NextResponse.json(
      {
        code: "INTERNAL_ERROR",
        message: "An error occurred while retrieving questions",
      },
      { status: 500 },
    );
  }
}
