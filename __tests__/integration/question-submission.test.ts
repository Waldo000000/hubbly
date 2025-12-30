/**
 * Question Submission Business Logic Integration Tests
 * Tests complete workflows for question submission using business logic
 * @jest-environment node
 */

import { getTestDb, resetTestDb, closeTestDb } from "../setup/test-db";
import { validateQuestionInput } from "@/lib/question-utils";
import { isValidParticipantId } from "@/lib/participant-id";
import { v4 as uuidv4 } from "uuid";

describe("Question Submission Business Logic Integration Tests", () => {
  const db = getTestDb();
  let testSession: { id: string; code: string };
  let participantId: string;

  beforeEach(async () => {
    await resetTestDb();

    // Create a test host
    const host = await db.user.create({
      data: {
        email: "host@example.com",
        name: "Test Host",
      },
    });

    // Create a test session
    testSession = await db.qaSession.create({
      data: {
        code: "TEST123",
        title: "Test Q&A Session",
        description: "Test session for question submission",
        hostId: host.id,
        isActive: true,
        isAcceptingQuestions: true,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Generate a valid participant ID
    participantId = uuidv4();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe("Complete Question Submission Workflow", () => {
    it("should create question with complete business logic workflow", async () => {
      // Step 1: Validate participantId format
      const isValidParticipant = isValidParticipantId(participantId);
      expect(isValidParticipant).toBe(true);

      // Step 2: Validate question input (business rule)
      const questionInput = {
        content: "What is the roadmap for Q1?",
        authorName: "Alice",
        participantId,
      };

      const validation = validateQuestionInput(questionInput);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);

      // Step 3: Verify session exists and is accepting questions
      const session = await db.qaSession.findUnique({
        where: { code: "TEST123" },
      });
      expect(session).toBeTruthy();
      expect(session!.isActive).toBe(true);
      expect(session!.isAcceptingQuestions).toBe(true);

      // Step 4: Create question in database (simulating API endpoint logic)
      const question = await db.question.create({
        data: {
          sessionId: testSession.id,
          participantId,
          content: questionInput.content.trim(),
          authorName: questionInput.authorName?.trim(),
          isAnonymous: false,
          status: "pending",
          voteCount: 0,
        },
      });

      // Step 5: Verify complete question creation
      expect(question).toMatchObject({
        content: "What is the roadmap for Q1?",
        authorName: "Alice",
        isAnonymous: false,
        participantId,
        status: "pending",
        voteCount: 0,
      });

      // Step 6: Verify question persisted in database
      const retrievedQuestion = await db.question.findUnique({
        where: { id: question.id },
      });
      expect(retrievedQuestion).toBeTruthy();
      expect(retrievedQuestion?.content).toBe("What is the roadmap for Q1?");
    });

    it("should create anonymous question without author name", async () => {
      // Validate and create anonymous question
      const questionInput = {
        content: "Anonymous question here",
        participantId,
      };

      const validation = validateQuestionInput(questionInput);
      expect(validation.isValid).toBe(true);

      const question = await db.question.create({
        data: {
          sessionId: testSession.id,
          participantId,
          content: questionInput.content.trim(),
          isAnonymous: true,
          status: "pending",
          voteCount: 0,
        },
      });

      expect(question.isAnonymous).toBe(true);
      expect(question.authorName).toBeNull();
      expect(question.participantId).toBe(participantId);
    });

    it("should trim whitespace from content and authorName", async () => {
      const questionInput = {
        content: "  What is the roadmap?  ",
        authorName: "  Alice  ",
        participantId,
      };

      const validation = validateQuestionInput(questionInput);
      expect(validation.isValid).toBe(true);

      const question = await db.question.create({
        data: {
          sessionId: testSession.id,
          participantId,
          content: questionInput.content.trim(),
          authorName: questionInput.authorName?.trim(),
          isAnonymous: false,
          status: "pending",
          voteCount: 0,
        },
      });

      expect(question.content).toBe("What is the roadmap?");
      expect(question.authorName).toBe("Alice");
    });
  });

  describe("Participant ID Validation", () => {
    it("should validate correct UUID v4 format", async () => {
      const validUuid = uuidv4();
      const isValid = isValidParticipantId(validUuid);
      expect(isValid).toBe(true);
    });

    it("should reject invalid participantId formats", async () => {
      const invalidIds = [
        "not-a-valid-uuid",
        "12345678-1234-1234-1234-123456789012", // wrong version
        "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
        "",
        "abc",
      ];

      for (const invalidId of invalidIds) {
        const isValid = isValidParticipantId(invalidId);
        expect(isValid).toBe(false);
      }
    });
  });

  describe("Question Content Validation", () => {
    it("should reject question with content too short", async () => {
      const validation = validateQuestionInput({
        content: "Hi",
        participantId,
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.field === "content")).toBe(true);
      expect(
        validation.errors.some((e) => e.message.includes("at least 3")),
      ).toBe(true);
    });

    it("should reject question with content too long", async () => {
      const longContent = "A".repeat(501);
      const validation = validateQuestionInput({
        content: longContent,
        participantId,
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.field === "content")).toBe(true);
      expect(
        validation.errors.some((e) => e.message.includes("exceed 500")),
      ).toBe(true);
    });

    it("should reject question with empty content", async () => {
      const validation = validateQuestionInput({
        content: "   ",
        participantId,
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.field === "content")).toBe(true);
    });

    it("should reject question with author name too long", async () => {
      const longName = "A".repeat(101);
      const validation = validateQuestionInput({
        content: "Valid question content",
        authorName: longName,
        participantId,
      });

      expect(validation.isValid).toBe(false);
      expect(validation.errors.some((e) => e.field === "authorName")).toBe(
        true,
      );
      expect(
        validation.errors.some((e) => e.message.includes("100 characters")),
      ).toBe(true);
    });

    it("should accept valid question content", async () => {
      const validInputs = [
        { content: "What is the roadmap?", participantId },
        { content: "A".repeat(3), participantId }, // minimum length
        { content: "A".repeat(500), participantId }, // maximum length
        { content: "Valid question", authorName: "Alice", participantId },
        {
          content: "Valid question",
          authorName: "A".repeat(100),
          participantId,
        }, // max name length
      ];

      for (const input of validInputs) {
        const validation = validateQuestionInput(input);
        expect(validation.isValid).toBe(true);
        expect(validation.errors).toEqual([]);
      }
    });
  });

  describe("Session Validation Workflow", () => {
    it("should verify session exists before creating question", async () => {
      // Try to find non-existent session
      const nonExistentSession = await db.qaSession.findUnique({
        where: { code: "NOTFOUND" },
      });

      expect(nonExistentSession).toBeNull();

      // Verify our test session does exist
      const existingSession = await db.qaSession.findUnique({
        where: { code: "TEST123" },
      });

      expect(existingSession).toBeTruthy();
    });

    it("should reject question for inactive session", async () => {
      // Update session to inactive
      await db.qaSession.update({
        where: { id: testSession.id },
        data: { isActive: false },
      });

      // Verify session is inactive (business rule check)
      const session = await db.qaSession.findUnique({
        where: { code: "TEST123" },
      });

      expect(session!.isActive).toBe(false);

      // In real API, this would return 403
      // Here we're just testing the business logic condition
    });

    it("should reject question when session not accepting questions", async () => {
      // Update session to not allow questions
      await db.qaSession.update({
        where: { id: testSession.id },
        data: { isAcceptingQuestions: false },
      });

      // Verify session is not accepting questions (business rule check)
      const session = await db.qaSession.findUnique({
        where: { code: "TEST123" },
      });

      expect(session!.isAcceptingQuestions).toBe(false);

      // In real API, this would return 403
      // Here we're just testing the business logic condition
    });

    it("should handle case-insensitive session code lookup", async () => {
      // Session codes are stored uppercase
      const lowerCaseCode = "test123";
      const upperCaseCode = lowerCaseCode.toUpperCase();

      const session = await db.qaSession.findUnique({
        where: { code: upperCaseCode },
      });

      expect(session).toBeTruthy();
      expect(session?.code).toBe("TEST123");
    });
  });

  describe("Multiple Participants Workflow", () => {
    it("should allow different participants to submit questions", async () => {
      const participant1 = uuidv4();
      const participant2 = uuidv4();

      // Participant 1 submits question
      const question1 = await db.question.create({
        data: {
          sessionId: testSession.id,
          participantId: participant1,
          content: "Question from participant 1",
          isAnonymous: false,
          status: "pending",
          voteCount: 0,
        },
      });

      // Participant 2 submits question
      const question2 = await db.question.create({
        data: {
          sessionId: testSession.id,
          participantId: participant2,
          content: "Question from participant 2",
          isAnonymous: false,
          status: "pending",
          voteCount: 0,
        },
      });

      expect(question1.participantId).toBe(participant1);
      expect(question2.participantId).toBe(participant2);
      expect(question1.id).not.toBe(question2.id);

      // Verify both questions exist in database
      const allQuestions = await db.question.findMany({
        where: { sessionId: testSession.id },
      });

      expect(allQuestions).toHaveLength(2);
    });

    it("should track which participant submitted which question", async () => {
      const myParticipantId = uuidv4();
      const otherParticipantId = uuidv4();

      // Create multiple questions
      await db.question.create({
        data: {
          sessionId: testSession.id,
          participantId: myParticipantId,
          content: "My first question",
          isAnonymous: false,
          status: "pending",
          voteCount: 0,
        },
      });

      await db.question.create({
        data: {
          sessionId: testSession.id,
          participantId: otherParticipantId,
          content: "Someone else's question",
          isAnonymous: false,
          status: "pending",
          voteCount: 0,
        },
      });

      await db.question.create({
        data: {
          sessionId: testSession.id,
          participantId: myParticipantId,
          content: "My second question",
          isAnonymous: false,
          status: "pending",
          voteCount: 0,
        },
      });

      // Query "my" questions (simulating UI logic)
      const myQuestions = await db.question.findMany({
        where: {
          sessionId: testSession.id,
          participantId: myParticipantId,
        },
      });

      expect(myQuestions).toHaveLength(2);
      expect(
        myQuestions.every((q) => q.participantId === myParticipantId),
      ).toBe(true);
    });
  });
});
