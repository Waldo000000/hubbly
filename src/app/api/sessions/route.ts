import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  generateUniqueSessionCode,
  getSessionExpirationDate,
  validateSessionInput,
} from "@/lib/session-utils";
import { CreateSessionRequest, CreateSessionResponse } from "@/types/session";

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Parse request body
    let body: CreateSessionRequest;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }

    const { title, description } = body;

    // Validate input
    const validation = validateSessionInput(title, description);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 },
      );
    }

    // Generate unique session code
    const code = await generateUniqueSessionCode();
    const expiresAt = getSessionExpirationDate();

    // Create session in database
    const qaSession = await prisma.qaSession.create({
      data: {
        title: title.trim(),
        description: description?.trim(),
        code,
        hostId: session.user.id,
        expiresAt,
      },
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
      },
    });

    const response: CreateSessionResponse = {
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
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Session creation error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
