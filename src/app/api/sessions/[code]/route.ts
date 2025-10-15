import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GetSessionResponse } from "@/types/session";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;

    // Validate code format (6 characters, alphanumeric, uppercase)
    if (!code || !/^[A-Z0-9]{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Invalid session code format" },
        { status: 400 },
      );
    }

    // Find session by code
    const qaSession = await prisma.qaSession.findUnique({
      where: { code },
      select: {
        id: true,
        title: true,
        description: true,
        code: true,
        hostId: true,
        isActive: true,
        isAcceptingQuestions: true,
        createdAt: true,
        updatedAt: true,
        expiresAt: true,
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            questions: true,
          },
        },
      },
    });

    if (!qaSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Check if session has expired
    if (new Date() > qaSession.expiresAt) {
      return NextResponse.json(
        { error: "Session has expired" },
        { status: 410 }, // Gone
      );
    }

    const response: GetSessionResponse = {
      session: {
        id: qaSession.id,
        title: qaSession.title,
        description: qaSession.description || undefined,
        code: qaSession.code,
        hostId: qaSession.hostId,
        isActive: qaSession.isActive,
        isAcceptingQuestions: qaSession.isAcceptingQuestions,
        createdAt: qaSession.createdAt.toISOString(),
        updatedAt: qaSession.updatedAt.toISOString(),
        expiresAt: qaSession.expiresAt.toISOString(),
        host: {
          id: qaSession.host.id,
          name: qaSession.host.name,
          email: qaSession.host.email,
        },
        _count: {
          questions: qaSession._count.questions,
        },
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Session retrieval error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
