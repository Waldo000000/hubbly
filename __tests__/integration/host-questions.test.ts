/**
 * Integration tests for host questions API endpoint
 * GET /api/sessions/[code]/host/questions
 * @jest-environment node
 */

// Mock NextAuth and auth before any imports
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock prisma to use test database
jest.mock("@/lib/db", () => {
  const { getTestDb } = require("../setup/test-db");
  return {
    prisma: getTestDb(),
  };
});

import { GET } from "@/app/api/sessions/[code]/host/questions/route";
import { NextRequest } from "next/server";
import { getTestDb, resetTestDb, closeTestDb } from "../setup/test-db";
import { v4 as uuidv4 } from "uuid";
import { getServerSession } from "next-auth";

const mockedGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

describe("Host Questions API Integration Tests", () => {
  const db = getTestDb();
  let testUser: { id: string; email: string };
  let testSession: { id: string; code: string; hostId: string };
  let otherUser: { id: string; email: string };

  beforeEach(async () => {
    await resetTestDb();

    // Create test users
    testUser = await db.user.create({
      data: {
        id: uuidv4(),
        email: "host@example.com",
        name: "Test Host",
      },
    });

    otherUser = await db.user.create({
      data: {
        id: uuidv4(),
        email: "other@example.com",
        name: "Other User",
      },
    });

    // Create test session
    testSession = await db.qaSession.create({
      data: {
        code: "TEST12",
        title: "Test Session",
        hostId: testUser.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe("Authentication and Authorization", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockedGetServerSession.mockResolvedValue(null);

      const req = new NextRequest(
        "http://localhost:3000/api/sessions/TEST12/host/questions",
      );
      const params = Promise.resolve({ code: "TEST12" });

      const response = await GET(req as any, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("should return 403 if user is not the session host", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: otherUser.id, email: otherUser.email },
        expires: new Date(Date.now() + 1000).toISOString(),
      });

      const req = new NextRequest(
        "http://localhost:3000/api/sessions/TEST12/host/questions",
      );
      const params = Promise.resolve({ code: "TEST12" });

      const response = await GET(req as any, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe("FORBIDDEN");
    });

    it("should return 404 if session does not exist", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email },
        expires: new Date(Date.now() + 1000).toISOString(),
      });

      const req = new NextRequest(
        "http://localhost:3000/api/sessions/NOTFOUND/host/questions",
      );
      const params = Promise.resolve({ code: "NOTFOUND" });

      const response = await GET(req as any, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe("SESSION_NOT_FOUND");
    });
  });

  describe("Questions Retrieval", () => {
    it("should return all questions sorted by vote count (descending)", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email },
        expires: new Date(Date.now() + 1000).toISOString(),
      });

      // Create questions with different vote counts
      const q1 = await db.question.create({
        data: {
          sessionId: testSession.id,
          participantId: uuidv4(),
          content: "Question with 10 votes",
          status: "approved",
          voteCount: 10,
        },
      });

      const q2 = await db.question.create({
        data: {
          sessionId: testSession.id,
          participantId: uuidv4(),
          content: "Question with 5 votes",
          status: "approved",
          voteCount: 5,
        },
      });

      const q3 = await db.question.create({
        data: {
          sessionId: testSession.id,
          participantId: uuidv4(),
          content: "Question with 15 votes",
          status: "pending",
          voteCount: 15,
        },
      });

      const req = new NextRequest(
        "http://localhost:3000/api/sessions/TEST12/host/questions",
      );
      const params = Promise.resolve({ code: "TEST12" });

      const response = await GET(req as any, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.questions).toHaveLength(3);
      expect(data.total).toBe(3);

      // Verify sorted by vote count descending
      expect(data.questions[0].id).toBe(q3.id);
      expect(data.questions[0].voteCount).toBe(15);
      expect(data.questions[1].id).toBe(q1.id);
      expect(data.questions[1].voteCount).toBe(10);
      expect(data.questions[2].id).toBe(q2.id);
      expect(data.questions[2].voteCount).toBe(5);
    });

    it("should return questions with all statuses (pending, approved, dismissed, etc.)", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email },
        expires: new Date(Date.now() + 1000).toISOString(),
      });

      // Create questions with different statuses
      await db.question.create({
        data: {
          sessionId: testSession.id,
          participantId: uuidv4(),
          content: "Pending question",
          status: "pending",
          voteCount: 5,
        },
      });

      await db.question.create({
        data: {
          sessionId: testSession.id,
          participantId: uuidv4(),
          content: "Approved question",
          status: "approved",
          voteCount: 3,
        },
      });

      await db.question.create({
        data: {
          sessionId: testSession.id,
          participantId: uuidv4(),
          content: "Dismissed question",
          status: "dismissed",
          voteCount: 1,
        },
      });

      await db.question.create({
        data: {
          sessionId: testSession.id,
          participantId: uuidv4(),
          content: "Answered question",
          status: "answered",
          voteCount: 8,
        },
      });

      const req = new NextRequest(
        "http://localhost:3000/api/sessions/TEST12/host/questions",
      );
      const params = Promise.resolve({ code: "TEST12" });

      const response = await GET(req as any, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.questions).toHaveLength(4);

      // Verify all statuses are included
      const statuses = data.questions.map((q: any) => q.status);
      expect(statuses).toContain("pending");
      expect(statuses).toContain("approved");
      expect(statuses).toContain("dismissed");
      expect(statuses).toContain("answered");
    });

    it("should return empty array when no questions exist", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email },
        expires: new Date(Date.now() + 1000).toISOString(),
      });

      const req = new NextRequest(
        "http://localhost:3000/api/sessions/TEST12/host/questions",
      );
      const params = Promise.resolve({ code: "TEST12" });

      const response = await GET(req as any, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.questions).toEqual([]);
      expect(data.total).toBe(0);
    });

    it("should return questions with all required fields", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email },
        expires: new Date(Date.now() + 1000).toISOString(),
      });

      const participantId = uuidv4();
      await db.question.create({
        data: {
          sessionId: testSession.id,
          participantId,
          authorName: "Test Author",
          content: "Test question",
          status: "approved",
          voteCount: 5,
          isAnonymous: false,
        },
      });

      const req = new NextRequest(
        "http://localhost:3000/api/sessions/TEST12/host/questions",
      );
      const params = Promise.resolve({ code: "TEST12" });

      const response = await GET(req as any, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      const question = data.questions[0];

      expect(question).toHaveProperty("id");
      expect(question).toHaveProperty("sessionId");
      expect(question).toHaveProperty("participantId");
      expect(question).toHaveProperty("authorName");
      expect(question).toHaveProperty("content");
      expect(question).toHaveProperty("voteCount");
      expect(question).toHaveProperty("status");
      expect(question).toHaveProperty("isAnonymous");
      expect(question).toHaveProperty("createdAt");
      expect(question).toHaveProperty("updatedAt");

      expect(question.content).toBe("Test question");
      expect(question.authorName).toBe("Test Author");
      expect(question.voteCount).toBe(5);
    });
  });
});
