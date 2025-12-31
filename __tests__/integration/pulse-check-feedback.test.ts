/**
 * Integration tests for pulse check feedback visibility and aggregation
 * Tests that pulse check stats appear in both host and participant views
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

import { GET as getParticipantQuestions } from "@/app/api/sessions/[code]/questions/route";
import { GET as getHostQuestions } from "@/app/api/sessions/[code]/host/questions/route";
import { NextRequest } from "next/server";
import { getTestDb, resetTestDb, closeTestDb } from "../setup/test-db";
import { v4 as uuidv4 } from "uuid";
import { getServerSession } from "next-auth";

const mockedGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

describe("Pulse Check Feedback Integration Tests", () => {
  const db = getTestDb();
  let testUser: { id: string; email: string };
  let testSession: { id: string; code: string; hostId: string };
  let answeredQuestion: { id: string; sessionId: string; status: string };
  let approvedQuestion: { id: string; sessionId: string; status: string };
  const participantId1 = uuidv4();
  const participantId2 = uuidv4();
  const participantId3 = uuidv4();

  beforeEach(async () => {
    await resetTestDb();

    // Create test user
    testUser = await db.user.create({
      data: {
        id: uuidv4(),
        email: "host@example.com",
        name: "Test Host",
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

    // Create answered question with pulse check feedback
    answeredQuestion = await db.question.create({
      data: {
        sessionId: testSession.id,
        participantId: uuidv4(),
        content: "Answered question with feedback",
        status: "answered",
        voteCount: 10,
      },
    });

    // Create approved question (no pulse check)
    approvedQuestion = await db.question.create({
      data: {
        sessionId: testSession.id,
        participantId: uuidv4(),
        content: "Approved question",
        status: "approved",
        voteCount: 5,
      },
    });

    // Add pulse check feedback from multiple participants
    await db.pulseCheckFeedback.create({
      data: {
        questionId: answeredQuestion.id,
        participantId: participantId1,
        feedback: "helpful",
      },
    });

    await db.pulseCheckFeedback.create({
      data: {
        questionId: answeredQuestion.id,
        participantId: participantId2,
        feedback: "helpful",
      },
    });

    await db.pulseCheckFeedback.create({
      data: {
        questionId: answeredQuestion.id,
        participantId: participantId3,
        feedback: "neutral",
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe("Participant View - Pulse Check Stats", () => {
    it("should include pulse check stats for answered questions", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/sessions/${testSession.code}/questions`,
      );
      const params = Promise.resolve({ code: testSession.code });

      const response = await getParticipantQuestions(req as any, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.questions).toHaveLength(2);

      // Find the answered question
      const answeredQ = data.questions.find(
        (q: any) => q.id === answeredQuestion.id,
      );
      expect(answeredQ).toBeDefined();
      expect(answeredQ.status).toBe("answered");
      expect(answeredQ.pulseCheckStats).toEqual({
        helpful: 2,
        neutral: 1,
        not_helpful: 0,
      });
    });

    it("should not include pulse check stats for non-answered questions", async () => {
      const req = new NextRequest(
        `http://localhost:3000/api/sessions/${testSession.code}/questions`,
      );
      const params = Promise.resolve({ code: testSession.code });

      const response = await getParticipantQuestions(req as any, { params });
      const data = await response.json();

      // Find the approved question
      const approvedQ = data.questions.find(
        (q: any) => q.id === approvedQuestion.id,
      );
      expect(approvedQ).toBeDefined();
      expect(approvedQ.status).toBe("approved");
      expect(approvedQ.pulseCheckStats).toBeUndefined();
    });

    it("should return empty stats for answered question with no feedback", async () => {
      // Create an answered question with no feedback
      const questionWithoutFeedback = await db.question.create({
        data: {
          sessionId: testSession.id,
          participantId: uuidv4(),
          content: "Answered question without feedback",
          status: "answered",
          voteCount: 3,
        },
      });

      const req = new NextRequest(
        `http://localhost:3000/api/sessions/${testSession.code}/questions`,
      );
      const params = Promise.resolve({ code: testSession.code });

      const response = await getParticipantQuestions(req as any, { params });
      const data = await response.json();

      const questionData = data.questions.find(
        (q: any) => q.id === questionWithoutFeedback.id,
      );
      expect(questionData).toBeDefined();
      expect(questionData.pulseCheckStats).toEqual({
        helpful: 0,
        neutral: 0,
        not_helpful: 0,
      });
    });
  });

  describe("Host View - Pulse Check Stats", () => {
    it("should include pulse check stats for answered questions", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email },
        expires: new Date(Date.now() + 1000).toISOString(),
      });

      const req = new NextRequest(
        `http://localhost:3000/api/sessions/${testSession.code}/host/questions`,
      );
      const params = Promise.resolve({ code: testSession.code });

      const response = await getHostQuestions(req as any, { params });
      const data = await response.json();

      expect(response.status).toBe(200);

      // Find the answered question
      const answeredQ = data.questions.find(
        (q: any) => q.id === answeredQuestion.id,
      );
      expect(answeredQ).toBeDefined();
      expect(answeredQ.status).toBe("answered");
      expect(answeredQ.pulseCheckStats).toEqual({
        helpful: 2,
        neutral: 1,
        not_helpful: 0,
      });
    });

    it("should not include pulse check stats for non-answered questions", async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: testUser.id, email: testUser.email },
        expires: new Date(Date.now() + 1000).toISOString(),
      });

      const req = new NextRequest(
        `http://localhost:3000/api/sessions/${testSession.code}/host/questions`,
      );
      const params = Promise.resolve({ code: testSession.code });

      const response = await getHostQuestions(req as any, { params });
      const data = await response.json();

      // Find the approved question
      const approvedQ = data.questions.find(
        (q: any) => q.id === approvedQuestion.id,
      );
      expect(approvedQ).toBeDefined();
      expect(approvedQ.status).toBe("approved");
      expect(approvedQ.pulseCheckStats).toBeUndefined();
    });
  });

  describe("Pulse Check Aggregation", () => {
    it("should correctly aggregate different feedback types", async () => {
      // Create a question with all types of feedback
      const question = await db.question.create({
        data: {
          sessionId: testSession.id,
          participantId: uuidv4(),
          content: "Question with all feedback types",
          status: "answered",
          voteCount: 8,
        },
      });

      // Add various feedback
      await db.pulseCheckFeedback.createMany({
        data: [
          {
            questionId: question.id,
            participantId: uuidv4(),
            feedback: "helpful",
          },
          {
            questionId: question.id,
            participantId: uuidv4(),
            feedback: "helpful",
          },
          {
            questionId: question.id,
            participantId: uuidv4(),
            feedback: "helpful",
          },
          {
            questionId: question.id,
            participantId: uuidv4(),
            feedback: "neutral",
          },
          {
            questionId: question.id,
            participantId: uuidv4(),
            feedback: "neutral",
          },
          {
            questionId: question.id,
            participantId: uuidv4(),
            feedback: "not_helpful",
          },
        ],
      });

      const req = new NextRequest(
        `http://localhost:3000/api/sessions/${testSession.code}/questions`,
      );
      const params = Promise.resolve({ code: testSession.code });

      const response = await getParticipantQuestions(req as any, { params });
      const data = await response.json();

      const questionData = data.questions.find(
        (q: any) => q.id === question.id,
      );
      expect(questionData.pulseCheckStats).toEqual({
        helpful: 3,
        neutral: 2,
        not_helpful: 1,
      });
    });
  });
});
