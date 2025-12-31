/**
 * Integration tests for question status update API endpoint
 * PATCH /api/questions/[id]
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

import { PATCH } from "@/app/api/questions/[id]/route";
import { NextRequest } from "next/server";
import { getTestDb, resetTestDb, closeTestDb } from "../setup/test-db";
import { v4 as uuidv4 } from "uuid";
import { getServerSession } from "next-auth";

const mockedGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

describe("Question Status Update API Integration Tests", () => {
  const db = getTestDb();
  let testUser: { id: string; email: string };
  let testSession: { id: string; code: string; hostId: string };
  let otherUser: { id: string; email: string };
  let testQuestion: {
    id: string;
    sessionId: string;
    content: string;
    status: string;
  };

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

    // Create test question
    testQuestion = await db.question.create({
      data: {
        sessionId: testSession.id,
        participantId: uuidv4(),
        content: "Test question",
        status: "approved",
        voteCount: 5,
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
        `http://localhost:3000/api/questions/${testQuestion.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "being_answered" }),
        },
      );
      const params = Promise.resolve({ id: testQuestion.id });

      const response = await PATCH(req as any, { params });
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
        `http://localhost:3000/api/questions/${testQuestion.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "being_answered" }),
        },
      );
      const params = Promise.resolve({ id: testQuestion.id });

      const response = await PATCH(req as any, { params });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe("FORBIDDEN");
    });

    it("should return 404 if question does not exist", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email },
        expires: new Date(Date.now() + 1000).toISOString(),
      });

      const fakeQuestionId = uuidv4();
      const req = new NextRequest(
        `http://localhost:3000/api/questions/${fakeQuestionId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "being_answered" }),
        },
      );
      const params = Promise.resolve({ id: fakeQuestionId });

      const response = await PATCH(req as any, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe("QUESTION_NOT_FOUND");
    });
  });

  describe("Status Validation", () => {
    it("should reject invalid status values", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email },
        expires: new Date(Date.now() + 1000).toISOString(),
      });

      const req = new NextRequest(
        `http://localhost:3000/api/questions/${testQuestion.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "invalid_status" }),
        },
      );
      const params = Promise.resolve({ id: testQuestion.id });

      const response = await PATCH(req as any, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("INVALID_STATUS");
      expect(data.message).toContain("being_answered");
      expect(data.message).toContain("answered");
    });

    it("should reject empty status", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email },
        expires: new Date(Date.now() + 1000).toISOString(),
      });

      const req = new NextRequest(
        `http://localhost:3000/api/questions/${testQuestion.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({}),
        },
      );
      const params = Promise.resolve({ id: testQuestion.id });

      const response = await PATCH(req as any, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("INVALID_STATUS");
    });

    it("should reject invalid JSON", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email },
        expires: new Date(Date.now() + 1000).toISOString(),
      });

      const req = new NextRequest(
        `http://localhost:3000/api/questions/${testQuestion.id}`,
        {
          method: "PATCH",
          body: "invalid json",
        },
      );
      const params = Promise.resolve({ id: testQuestion.id });

      const response = await PATCH(req as any, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe("INVALID_JSON");
    });
  });

  describe("Status Updates", () => {
    it("should successfully update status to being_answered", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email },
        expires: new Date(Date.now() + 1000).toISOString(),
      });

      const req = new NextRequest(
        `http://localhost:3000/api/questions/${testQuestion.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "being_answered" }),
        },
      );
      const params = Promise.resolve({ id: testQuestion.id });

      const response = await PATCH(req as any, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.question.id).toBe(testQuestion.id);
      expect(data.question.status).toBe("being_answered");
      expect(data.message).toBe("Question status updated successfully");

      // Verify database was updated
      const updatedQuestion = await db.question.findUnique({
        where: { id: testQuestion.id },
      });
      expect(updatedQuestion?.status).toBe("being_answered");
    });

    it("should successfully update status to answered", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email },
        expires: new Date(Date.now() + 1000).toISOString(),
      });

      const req = new NextRequest(
        `http://localhost:3000/api/questions/${testQuestion.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "answered" }),
        },
      );
      const params = Promise.resolve({ id: testQuestion.id });

      const response = await PATCH(req as any, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.question.id).toBe(testQuestion.id);
      expect(data.question.status).toBe("answered");
      expect(data.message).toBe("Question status updated successfully");

      // Verify database was updated
      const updatedQuestion = await db.question.findUnique({
        where: { id: testQuestion.id },
      });
      expect(updatedQuestion?.status).toBe("answered");
    });

    it("should return all question fields after update", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email },
        expires: new Date(Date.now() + 1000).toISOString(),
      });

      const req = new NextRequest(
        `http://localhost:3000/api/questions/${testQuestion.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "answered" }),
        },
      );
      const params = Promise.resolve({ id: testQuestion.id });

      const response = await PATCH(req as any, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.question).toHaveProperty("id");
      expect(data.question).toHaveProperty("sessionId");
      expect(data.question).toHaveProperty("content");
      expect(data.question).toHaveProperty("voteCount");
      expect(data.question).toHaveProperty("status");
      expect(data.question).toHaveProperty("isAnonymous");
      expect(data.question).toHaveProperty("createdAt");
      expect(data.question).toHaveProperty("updatedAt");
    });

    it("should allow multiple status updates on same question", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email },
        expires: new Date(Date.now() + 1000).toISOString(),
      });

      // First update to being_answered
      const req1 = new NextRequest(
        `http://localhost:3000/api/questions/${testQuestion.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "being_answered" }),
        },
      );
      const params1 = Promise.resolve({ id: testQuestion.id });
      const response1 = await PATCH(req1 as any, { params: params1 });
      const data1 = await response1.json();

      expect(response1.status).toBe(200);
      expect(data1.question.status).toBe("being_answered");

      // Second update to answered
      const req2 = new NextRequest(
        `http://localhost:3000/api/questions/${testQuestion.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: "answered" }),
        },
      );
      const params2 = Promise.resolve({ id: testQuestion.id });
      const response2 = await PATCH(req2 as any, { params: params2 });
      const data2 = await response2.json();

      expect(response2.status).toBe(200);
      expect(data2.question.status).toBe("answered");

      // Verify final state
      const finalQuestion = await db.question.findUnique({
        where: { id: testQuestion.id },
      });
      expect(finalQuestion?.status).toBe("answered");
    });
  });
});
