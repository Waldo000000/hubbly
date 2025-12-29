import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { GetSessionResponse } from "@/types/session";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const { code } = await params;

    // Validate code format
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
        hostId: true,
        expiresAt: true,
      },
    });

    if (!qaSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify host ownership
    if (qaSession.hostId !== session.user.id) {
      return NextResponse.json(
        { error: "Access denied. You are not the host of this session." },
        { status: 403 },
      );
    }

    // Check if session has expired
    if (new Date() > qaSession.expiresAt) {
      return NextResponse.json(
        { error: "Session has expired" },
        { status: 410 },
      );
    }

    // Parse request body
    const body = await req.json();

    // Validate and build update data
    const updateData: {
      isActive?: boolean;
      isAcceptingQuestions?: boolean;
    } = {};

    if (typeof body.isActive === "boolean") {
      updateData.isActive = body.isActive;
    }

    if (typeof body.isAcceptingQuestions === "boolean") {
      updateData.isAcceptingQuestions = body.isAcceptingQuestions;
    }

    // Ensure at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    // Update session
    const updatedSession = await prisma.qaSession.update({
      where: { id: qaSession.id },
      data: updateData,
      select: {
        id: true,
        isActive: true,
        isAcceptingQuestions: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        session: {
          id: updatedSession.id,
          isActive: updatedSession.isActive,
          isAcceptingQuestions: updatedSession.isAcceptingQuestions,
          updatedAt: updatedSession.updatedAt.toISOString(),
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Session update error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
