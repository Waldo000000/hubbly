/**
 * @jest-environment node
 *
 * Integration tests for "being answered" question highlighting and sorting
 */

import { getTestDb, resetTestDb, closeTestDb } from "../setup/test-db";
import { sortQuestions } from "@/lib/question-utils";
import type { QuestionResponse } from "@/types/question";

describe("Being Answered Question Highlighting and Sorting", () => {
  const db = getTestDb();
  let sessionId: string;
  let sessionCode: string;
  let userId: string;

  beforeEach(async () => {
    await resetTestDb();

    // Create test user
    const user = await db.user.create({
      data: {
        email: "test@example.com",
        name: "Test User",
      },
    });
    userId = user.id;

    // Create test session
    const session = await db.qaSession.create({
      data: {
        code: "TST001",
        title: "Test Session",
        description: "Test session for being_answered tests",
        hostId: userId,
        isActive: true,
        isAcceptingQuestions: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    sessionId = session.id;
    sessionCode = session.code;
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe("Multi-level Sorting Logic", () => {
    it("should sort questions: being_answered first, then by votes DESC, then by createdAt ASC", async () => {
      // Create questions with various statuses, votes, and timestamps
      const now = Date.now();

      // Question 1: High votes, old (should be 2nd)
      const q1 = await db.question.create({
        data: {
          content: "Question with high votes",
          sessionId,
          participantId: "participant-1",
          status: "approved",
          voteCount: 10,
          createdAt: new Date(now - 5000), // 5 seconds ago
        },
      });

      // Question 2: Being answered, low votes (should be 1st)
      const q2 = await db.question.create({
        data: {
          content: "Question being answered",
          sessionId,
          participantId: "participant-2",
          status: "being_answered",
          voteCount: 2,
          createdAt: new Date(now - 3000), // 3 seconds ago
        },
      });

      // Question 3: Medium votes, newer (should be 3rd)
      const q3 = await db.question.create({
        data: {
          content: "Question with medium votes",
          sessionId,
          participantId: "participant-3",
          status: "approved",
          voteCount: 5,
          createdAt: new Date(now - 2000), // 2 seconds ago
        },
      });

      // Question 4: Zero votes, oldest with 0 votes (should be 4th)
      const q4 = await db.question.create({
        data: {
          content: "New question, older",
          sessionId,
          participantId: "participant-4",
          status: "approved",
          voteCount: 0,
          createdAt: new Date(now - 1000), // 1 second ago
        },
      });

      // Question 5: Zero votes, newest (should be 5th - at bottom)
      const q5 = await db.question.create({
        data: {
          content: "New question, newest",
          sessionId,
          participantId: "participant-5",
          status: "approved",
          voteCount: 0,
          createdAt: new Date(now), // just now
        },
      });

      // Fetch questions
      const questions = await db.question.findMany({
        where: { sessionId },
      });

      // Map to QuestionResponse format
      const questionResponses: QuestionResponse[] = questions.map((q) => ({
        id: q.id,
        content: q.content,
        authorName: q.authorName,
        isAnonymous: q.isAnonymous,
        status: q.status,
        voteCount: q.voteCount,
        createdAt: q.createdAt.toISOString(),
      }));

      // Sort using utility function
      const sorted = sortQuestions(questionResponses);

      // Verify sort order
      expect(sorted[0].id).toBe(q2.id); // being_answered first
      expect(sorted[1].id).toBe(q1.id); // highest votes
      expect(sorted[2].id).toBe(q3.id); // medium votes
      expect(sorted[3].id).toBe(q4.id); // 0 votes, older
      expect(sorted[4].id).toBe(q5.id); // 0 votes, newest (at bottom)
    });

    it("should show newly-added questions (0 votes) at bottom", async () => {
      const now = Date.now();

      // Create 3 questions with different vote counts
      const q1 = await db.question.create({
        data: {
          content: "Question with votes",
          sessionId,
          participantId: "participant-1",
          status: "approved",
          voteCount: 5,
          createdAt: new Date(now - 3000),
        },
      });

      const q2 = await db.question.create({
        data: {
          content: "Another question with votes",
          sessionId,
          participantId: "participant-2",
          status: "approved",
          voteCount: 3,
          createdAt: new Date(now - 2000),
        },
      });

      // Newly-added question with 0 votes
      const q3 = await db.question.create({
        data: {
          content: "Brand new question",
          sessionId,
          participantId: "participant-3",
          status: "approved",
          voteCount: 0,
          createdAt: new Date(now), // just added
        },
      });

      const questions = await db.question.findMany({
        where: { sessionId },
      });

      const questionResponses: QuestionResponse[] = questions.map((q) => ({
        id: q.id,
        content: q.content,
        authorName: q.authorName,
        isAnonymous: q.isAnonymous,
        status: q.status,
        voteCount: q.voteCount,
        createdAt: q.createdAt.toISOString(),
      }));

      const sorted = sortQuestions(questionResponses);

      // New question should be at the bottom
      expect(sorted[sorted.length - 1].id).toBe(q3.id);
      expect(sorted[sorted.length - 1].voteCount).toBe(0);
    });

    it("should always show being_answered question at top regardless of votes", async () => {
      // Create questions where being_answered has lowest votes
      const q1 = await db.question.create({
        data: {
          content: "Popular question",
          sessionId,
          participantId: "participant-1",
          status: "approved",
          voteCount: 20,
        },
      });

      const q2 = await db.question.create({
        data: {
          content: "Medium popularity",
          sessionId,
          participantId: "participant-2",
          status: "approved",
          voteCount: 10,
        },
      });

      // Being answered with only 1 vote
      const q3 = await db.question.create({
        data: {
          content: "Currently being answered",
          sessionId,
          participantId: "participant-3",
          status: "being_answered",
          voteCount: 1,
        },
      });

      const questions = await db.question.findMany({
        where: { sessionId },
      });

      const questionResponses: QuestionResponse[] = questions.map((q) => ({
        id: q.id,
        content: q.content,
        authorName: q.authorName,
        isAnonymous: q.isAnonymous,
        status: q.status,
        voteCount: q.voteCount,
        createdAt: q.createdAt.toISOString(),
      }));

      const sorted = sortQuestions(questionResponses);

      // being_answered should be first despite having lowest votes
      expect(sorted[0].id).toBe(q3.id);
      expect(sorted[0].status).toBe("being_answered");
      expect(sorted[0].voteCount).toBe(1);

      // Other questions sorted by votes
      expect(sorted[1].id).toBe(q1.id);
      expect(sorted[2].id).toBe(q2.id);
    });

    it("should handle multiple being_answered questions correctly", async () => {
      // Create two being_answered questions (edge case - shouldn't normally happen)
      const q1 = await db.question.create({
        data: {
          content: "First being answered",
          sessionId,
          participantId: "participant-1",
          status: "being_answered",
          voteCount: 10,
          createdAt: new Date(Date.now() - 2000),
        },
      });

      const q2 = await db.question.create({
        data: {
          content: "Second being answered",
          sessionId,
          participantId: "participant-2",
          status: "being_answered",
          voteCount: 5,
          createdAt: new Date(Date.now() - 1000),
        },
      });

      const q3 = await db.question.create({
        data: {
          content: "Regular question",
          sessionId,
          participantId: "participant-3",
          status: "approved",
          voteCount: 15,
        },
      });

      const questions = await db.question.findMany({
        where: { sessionId },
      });

      const questionResponses: QuestionResponse[] = questions.map((q) => ({
        id: q.id,
        content: q.content,
        authorName: q.authorName,
        isAnonymous: q.isAnonymous,
        status: q.status,
        voteCount: q.voteCount,
        createdAt: q.createdAt.toISOString(),
      }));

      const sorted = sortQuestions(questionResponses);

      // Both being_answered questions should be at top
      expect(sorted[0].status).toBe("being_answered");
      expect(sorted[1].status).toBe("being_answered");

      // Among being_answered questions, should be sorted by votes
      expect(sorted[0].id).toBe(q1.id); // 10 votes
      expect(sorted[1].id).toBe(q2.id); // 5 votes

      // Regular question at bottom despite high votes
      expect(sorted[2].id).toBe(q3.id);
    });
  });

  describe("Question Status Identification", () => {
    it("should correctly identify question with being_answered status", async () => {
      const question = await db.question.create({
        data: {
          content: "Test question",
          sessionId,
          participantId: "participant-1",
          status: "being_answered",
          voteCount: 0,
        },
      });

      const retrieved = await db.question.findUnique({
        where: { id: question.id },
      });

      expect(retrieved).not.toBeNull();
      expect(retrieved?.status).toBe("being_answered");
    });

    it("should handle transition from approved to being_answered", async () => {
      const question = await db.question.create({
        data: {
          content: "Test question",
          sessionId,
          participantId: "participant-1",
          status: "approved",
          voteCount: 5,
        },
      });

      // Update to being_answered
      const updated = await db.question.update({
        where: { id: question.id },
        data: { status: "being_answered" },
      });

      expect(updated.status).toBe("being_answered");
      expect(updated.voteCount).toBe(5); // Vote count preserved
    });
  });

  describe("Sorting Stability", () => {
    it("should maintain stable sort for questions with same votes and timestamps", async () => {
      const now = Date.now();

      // Create multiple questions with identical votes and close timestamps
      const questions = await Promise.all([
        db.question.create({
          data: {
            content: "Question A",
            sessionId,
            participantId: "participant-1",
            status: "approved",
            voteCount: 5,
            createdAt: new Date(now),
          },
        }),
        db.question.create({
          data: {
            content: "Question B",
            sessionId,
            participantId: "participant-2",
            status: "approved",
            voteCount: 5,
            createdAt: new Date(now),
          },
        }),
        db.question.create({
          data: {
            content: "Question C",
            sessionId,
            participantId: "participant-3",
            status: "approved",
            voteCount: 5,
            createdAt: new Date(now),
          },
        }),
      ]);

      const retrieved = await db.question.findMany({
        where: { sessionId },
      });

      const questionResponses: QuestionResponse[] = retrieved.map((q) => ({
        id: q.id,
        content: q.content,
        authorName: q.authorName,
        isAnonymous: q.isAnonymous,
        status: q.status,
        voteCount: q.voteCount,
        createdAt: q.createdAt.toISOString(),
      }));

      const sorted = sortQuestions(questionResponses);

      // All should have same vote count
      expect(sorted.every((q) => q.voteCount === 5)).toBe(true);

      // Should maintain consistent order across multiple sorts
      const sorted2 = sortQuestions(questionResponses);
      expect(sorted.map((q) => q.id)).toEqual(sorted2.map((q) => q.id));
    });
  });
});
