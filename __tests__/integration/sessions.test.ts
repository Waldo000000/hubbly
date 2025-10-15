/**
 * Session Business Logic Integration Tests
 * Tests complete workflows for session creation and retrieval using business logic
 * @jest-environment node
 */

import { getTestDb, resetTestDb, closeTestDb } from "../setup/test-db";
import {
  generateUniqueSessionCode,
  validateSessionInput,
  getSessionExpirationDate,
} from "@/lib/session-utils";

describe("Session Business Logic Integration Tests", () => {
  const db = getTestDb();

  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe("Complete Session Creation Workflow", () => {
    it("should create session with complete business logic workflow", async () => {
      // Step 1: Create a host user
      const host = await db.user.create({
        data: {
          email: "integration@example.com",
          name: "Integration Test Host",
        },
      });

      // Step 2: Validate session input (business rule)
      const sessionInput = {
        title: "Integration Test Session",
        description: "Complete workflow integration test",
      };

      const validation = validateSessionInput(sessionInput);
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual({});

      // Step 3: Generate unique session code
      const sessionCode = await generateUniqueSessionCode(db);
      expect(sessionCode).toMatch(/^[A-Z0-9]{6}$/);

      // Step 4: Get proper expiration date
      const expiresAt = getSessionExpirationDate();
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Step 5: Create session in database (simulating API endpoint logic)
      const session = await db.qaSession.create({
        data: {
          title: sessionInput.title.trim(),
          description: sessionInput.description?.trim(),
          code: sessionCode,
          hostId: host.id,
          expiresAt,
        },
        include: {
          host: true,
        },
      });

      // Step 6: Verify complete session creation
      expect(session).toMatchObject({
        title: sessionInput.title,
        description: sessionInput.description,
        code: sessionCode,
        hostId: host.id,
        isActive: true,
        isAcceptingQuestions: true,
      });

      expect(session.host).toMatchObject({
        email: "integration@example.com",
        name: "Integration Test Host",
      });

      expect(session.expiresAt.getTime()).toBe(expiresAt.getTime());
    });

    it("should handle input validation failures properly", async () => {
      // Test various invalid inputs
      const invalidInputs = [
        { title: "", description: "Valid description" },
        { title: "AB", description: "Valid description" },
        { title: "a".repeat(101), description: "Valid description" },
        { title: "Valid Title", description: "a".repeat(501) },
      ];

      for (const input of invalidInputs) {
        const validation = validateSessionInput(input);
        expect(validation.isValid).toBe(false);
        expect(Object.keys(validation.errors).length).toBeGreaterThan(0);
      }
    });

    it("should ensure session code uniqueness across multiple creations", async () => {
      const host = await db.user.create({
        data: {
          email: "uniqueness@example.com",
          name: "Uniqueness Test Host",
        },
      });

      const sessionCodes: string[] = [];
      const sessions = [];

      // Create multiple sessions with business logic
      for (let i = 0; i < 20; i++) {
        const input = {
          title: `Uniqueness Test Session ${i + 1}`,
          description: `Session ${i + 1} for uniqueness testing`,
        };

        // Validate input
        const validation = validateSessionInput(input);
        expect(validation.isValid).toBe(true);

        // Generate unique code
        const code = await generateUniqueSessionCode(db);
        sessionCodes.push(code);

        // Create session
        const session = await db.qaSession.create({
          data: {
            title: input.title,
            description: input.description,
            code,
            hostId: host.id,
            expiresAt: getSessionExpirationDate(),
          },
        });

        sessions.push(session);
      }

      // Verify all codes are unique
      const uniqueCodes = new Set(sessionCodes);
      expect(uniqueCodes.size).toBe(sessionCodes.length);

      // Verify all codes follow the format
      sessionCodes.forEach((code) => {
        expect(code).toMatch(/^[A-Z0-9]{6}$/);
      });
    });
  });

  describe("Session Retrieval and Validation Workflow", () => {
    it("should retrieve session with complete business logic", async () => {
      // Setup: Create host and session
      const host = await db.user.create({
        data: {
          email: "retrieval@example.com",
          name: "Retrieval Test Host",
        },
      });

      const sessionCode = await generateUniqueSessionCode(db);
      const expiresAt = getSessionExpirationDate();

      const session = await db.qaSession.create({
        data: {
          title: "Retrieval Test Session",
          description: "Testing complete retrieval workflow",
          code: sessionCode,
          hostId: host.id,
          expiresAt,
        },
      });

      // Step 1: Validate code format (simulating API validation)
      const isValidFormat = /^[A-Z0-9]{6}$/.test(sessionCode);
      expect(isValidFormat).toBe(true);

      // Step 2: Retrieve session from database (simulating API logic)
      const retrievedSession = await db.qaSession.findUnique({
        where: { code: sessionCode },
        include: {
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

      expect(retrievedSession).toBeTruthy();

      // Step 3: Check expiration (business rule)
      const now = new Date();
      expect(retrievedSession!.expiresAt.getTime()).toBeGreaterThan(
        now.getTime(),
      );

      // Step 4: Verify complete response structure
      expect(retrievedSession).toMatchObject({
        id: session.id,
        title: "Retrieval Test Session",
        description: "Testing complete retrieval workflow",
        code: sessionCode,
        hostId: host.id,
        isActive: true,
        isAcceptingQuestions: true,
      });

      expect(retrievedSession!.host).toMatchObject({
        id: host.id,
        email: "retrieval@example.com",
        name: "Retrieval Test Host",
      });

      expect(retrievedSession!._count.questions).toBe(0);
    });

    it("should handle expired session detection", async () => {
      // Setup: Create expired session
      const host = await db.user.create({
        data: {
          email: "expired@example.com",
          name: "Expired Test Host",
        },
      });

      const expiredDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const sessionCode = await generateUniqueSessionCode(db);

      await db.qaSession.create({
        data: {
          title: "Expired Session",
          code: sessionCode,
          hostId: host.id,
          expiresAt: expiredDate,
        },
      });

      // Retrieve session
      const retrievedSession = await db.qaSession.findUnique({
        where: { code: sessionCode },
      });

      expect(retrievedSession).toBeTruthy();

      // Check expiration logic (business rule)
      const now = new Date();
      const isExpired = now > retrievedSession!.expiresAt;
      expect(isExpired).toBe(true);
    });

    it("should handle invalid session code formats", async () => {
      const invalidCodes = [
        "abc123", // lowercase
        "ABC12", // too short
        "ABC1234", // too long
        "ABC-123", // invalid character
        "ABC 123", // space
        "", // empty
        "ÄBC123", // special character
      ];

      for (const code of invalidCodes) {
        // Test code format validation (simulating API validation)
        const isValidFormat = /^[A-Z0-9]{6}$/.test(code);
        expect(isValidFormat).toBe(false);

        // Attempt to find session should return null
        const session = await db.qaSession.findUnique({
          where: { code },
        });
        expect(session).toBeNull();
      }
    });

    it("should include session statistics in complete retrieval", async () => {
      // Setup: Create session with questions
      const host = await db.user.create({
        data: {
          email: "stats@example.com",
          name: "Stats Test Host",
        },
      });

      const sessionCode = await generateUniqueSessionCode(db);

      const session = await db.qaSession.create({
        data: {
          title: "Session with Statistics",
          code: sessionCode,
          hostId: host.id,
          expiresAt: getSessionExpirationDate(),
          questions: {
            create: [
              { content: "Question 1", authorName: "User A" },
              { content: "Question 2", authorName: "User B" },
              { content: "Anonymous Question", isAnonymous: true },
              { content: "Question 4", authorName: "User C" },
            ],
          },
        },
      });

      // Retrieve with statistics
      const sessionWithStats = await db.qaSession.findUnique({
        where: { code: sessionCode },
        include: {
          host: true,
          _count: {
            select: {
              questions: true,
            },
          },
        },
      });

      expect(sessionWithStats).toBeTruthy();
      expect(sessionWithStats!._count.questions).toBe(4);
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle database constraint violations gracefully", async () => {
      const host = await db.user.create({
        data: {
          email: "constraint@example.com",
          name: "Constraint Test Host",
        },
      });

      const duplicateCode = "DUPLIC";

      // Create first session
      await db.qaSession.create({
        data: {
          title: "First Session",
          code: duplicateCode,
          hostId: host.id,
          expiresAt: getSessionExpirationDate(),
        },
      });

      // Attempt to create second session with same code should fail
      await expect(
        db.qaSession.create({
          data: {
            title: "Duplicate Session",
            code: duplicateCode,
            hostId: host.id,
            expiresAt: getSessionExpirationDate(),
          },
        }),
      ).rejects.toThrow();
    });

    it("should maintain referential integrity with host deletion", async () => {
      const host = await db.user.create({
        data: {
          email: "cascade@example.com",
          name: "Cascade Test Host",
        },
      });

      const sessionCode = await generateUniqueSessionCode(db);

      await db.qaSession.create({
        data: {
          title: "Session for Cascade Test",
          code: sessionCode,
          hostId: host.id,
          expiresAt: getSessionExpirationDate(),
        },
      });

      // Delete host (should cascade delete sessions)
      await db.user.delete({
        where: { id: host.id },
      });

      // Verify session was deleted due to cascade
      const orphanedSession = await db.qaSession.findUnique({
        where: { code: sessionCode },
      });

      expect(orphanedSession).toBeNull();
    });
  });
});
