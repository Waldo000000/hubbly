/**
 * Session Utilities Business Logic Tests
 * Tests core business logic functions for session management
 * @jest-environment node
 */

import {
  generateUniqueSessionCode,
  validateSessionInput,
  getSessionExpirationDate,
} from "@/lib/session-utils";

/**
 * Helper function to validate session code format
 * Since this is not exported from session-utils, we define it here for testing
 */
function isValidSessionCode(code: any): boolean {
  if (typeof code !== "string") return false;
  return /^[A-Z0-9]{6}$/.test(code);
}
import { getTestDb, resetTestDb, closeTestDb } from "../setup/test-db";

describe("Session Utilities Business Logic", () => {
  const db = getTestDb();

  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  describe("generateUniqueSessionCode", () => {
    it("should generate valid 6-character alphanumeric codes", async () => {
      const code = await generateUniqueSessionCode(db);

      expect(code).toMatch(/^[A-Z0-9]{6}$/);
      expect(code).toHaveLength(6);
    });

    it("should generate unique codes across multiple calls", async () => {
      const codes = new Set<string>();

      // Generate 100 codes to test uniqueness
      for (let i = 0; i < 100; i++) {
        const code = await generateUniqueSessionCode(db);
        expect(codes.has(code)).toBe(false);
        codes.add(code);
      }

      expect(codes.size).toBe(100);
    });

    it("should avoid codes that already exist in database", async () => {
      // Setup: Create a user and session with specific code
      const host = await db.user.create({
        data: {
          email: "test@example.com",
          name: "Test User",
        },
      });

      const existingCode = "EXIST1";
      await db.qaSession.create({
        data: {
          title: "Existing Session",
          code: existingCode,
          hostId: host.id,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      // Test: Generate new codes should not conflict
      const newCodes = [];
      for (let i = 0; i < 10; i++) {
        const code = await generateUniqueSessionCode(db);
        newCodes.push(code);
        expect(code).not.toBe(existingCode);
      }

      // Verify all new codes are unique
      const uniqueNewCodes = new Set(newCodes);
      expect(uniqueNewCodes.size).toBe(newCodes.length);
    });

    it("should handle edge case of code collision gracefully", async () => {
      // Create multiple sessions to increase collision probability
      const host = await db.user.create({
        data: {
          email: "test@example.com",
          name: "Test User",
        },
      });

      // Fill database with many sessions
      const existingCodes: string[] = [];
      for (let i = 0; i < 50; i++) {
        const code = await generateUniqueSessionCode(db);
        await db.qaSession.create({
          data: {
            title: `Session ${i}`,
            code,
            hostId: host.id,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        existingCodes.push(code);
      }

      // Test: Should still generate unique codes
      const newCode = await generateUniqueSessionCode(db);
      expect(existingCodes).not.toContain(newCode);
      expect(newCode).toMatch(/^[A-Z0-9]{6}$/);
    });
  });

  describe("validateSessionInput", () => {
    it("should validate correct input successfully", async () => {
      const validInputs = [
        {
          title: "Valid Session Title",
          description: "Valid description",
        },
        {
          title: "Min", // 3 characters minimum
        },
        {
          title: "a".repeat(100), // 100 characters maximum
          description: "a".repeat(500), // 500 characters maximum
        },
        {
          title: "Session without description",
          // description is optional
        },
      ];

      validInputs.forEach((input) => {
        const result = validateSessionInput(input);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual({});
      });
    });

    it("should reject invalid titles according to business rules", async () => {
      const invalidTitleInputs = [
        {
          input: { title: "" },
          expectedError: "Title is required",
        },
        {
          input: { title: "AB" },
          expectedError: "Title must be at least 3 characters long",
        },
        {
          input: { title: "a".repeat(101) },
          expectedError: "Title must be no more than 100 characters long",
        },
        {
          input: {}, // missing title
          expectedError: "Title is required",
        },
      ];

      invalidTitleInputs.forEach(({ input, expectedError }) => {
        const result = validateSessionInput(input as any);
        expect(result.isValid).toBe(false);
        expect(result.errors.title).toBe(expectedError);
      });
    });

    it("should reject invalid descriptions according to business rules", async () => {
      const invalidDescriptionInputs = [
        {
          input: {
            title: "Valid Title",
            description: "a".repeat(501), // Too long
          },
          expectedError: "Description must be no more than 500 characters long",
        },
      ];

      invalidDescriptionInputs.forEach(({ input, expectedError }) => {
        const result = validateSessionInput(input);
        expect(result.isValid).toBe(false);
        expect(result.errors.description).toBe(expectedError);
      });
    });

    it("should handle multiple validation errors", async () => {
      const input = {
        title: "AB", // too short
        description: "a".repeat(501), // too long
      };

      const result = validateSessionInput(input);

      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBe(
        "Title must be at least 3 characters long",
      );
      expect(result.errors.description).toBe(
        "Description must be no more than 500 characters long",
      );
    });

    it("should trim whitespace and validate correctly", async () => {
      // Valid after trimming
      const validInput = {
        title: "   Valid Title   ",
        description: "   Valid description   ",
      };

      const result = validateSessionInput(validInput);
      expect(result.isValid).toBe(true);

      // Invalid after trimming
      const invalidInput = {
        title: "   AB   ", // Still too short after trimming
        description: "   " + "a".repeat(501) + "   ", // Still too long after trimming
      };

      const invalidResult = validateSessionInput(invalidInput);
      expect(invalidResult.isValid).toBe(false);
    });

    it("should handle edge cases and special characters", async () => {
      const edgeCases = [
        {
          title: "Session with émojis 🎉",
          description: "Description with special chars: @#$%^&*()",
        },
        {
          title: "123 Numeric Session",
          description: "Numbers in description: 12345",
        },
        {
          title: "Session\nwith\nnewlines",
          description: "Description\nwith\nnewlines",
        },
      ];

      edgeCases.forEach((input) => {
        const result = validateSessionInput(input);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe("getSessionExpirationDate", () => {
    it("should return date exactly 24 hours from now", async () => {
      const before = new Date();
      const expirationDate = getSessionExpirationDate();
      const after = new Date();

      // Should be approximately 24 hours from creation time
      const expectedMinExpiration = new Date(
        before.getTime() + 24 * 60 * 60 * 1000,
      );
      const expectedMaxExpiration = new Date(
        after.getTime() + 24 * 60 * 60 * 1000,
      );

      expect(expirationDate.getTime()).toBeGreaterThanOrEqual(
        expectedMinExpiration.getTime(),
      );
      expect(expirationDate.getTime()).toBeLessThanOrEqual(
        expectedMaxExpiration.getTime(),
      );
    });

    it("should return consistent results within reasonable timeframe", async () => {
      const expiration1 = getSessionExpirationDate();

      // Wait a small amount
      await new Promise((resolve) => setTimeout(resolve, 10));

      const expiration2 = getSessionExpirationDate();

      // Should be very close (within 1 second difference)
      const timeDifference = Math.abs(
        expiration2.getTime() - expiration1.getTime(),
      );
      expect(timeDifference).toBeLessThan(1000);
    });

    it("should always return future dates", async () => {
      const now = new Date();
      const expirationDate = getSessionExpirationDate();

      expect(expirationDate.getTime()).toBeGreaterThan(now.getTime());
    });

    it("should handle date precision correctly", async () => {
      const expirationDate = getSessionExpirationDate();

      // Should be a valid Date object
      expect(expirationDate instanceof Date).toBe(true);
      expect(isNaN(expirationDate.getTime())).toBe(false);

      // Should have reasonable precision (not just rounded to hours)
      const now = new Date();
      const hoursDifference =
        (expirationDate.getTime() - now.getTime()) / (60 * 60 * 1000);
      expect(hoursDifference).toBeGreaterThan(23.9);
      expect(hoursDifference).toBeLessThan(24.1);
    });
  });

  describe("isValidSessionCode", () => {
    it("should validate correct session code formats", async () => {
      const validCodes = [
        "ABC123",
        "XYZ789",
        "123456",
        "ABCDEF",
        "A1B2C3",
        "TEST01",
      ];

      validCodes.forEach((code) => {
        expect(isValidSessionCode(code)).toBe(true);
      });
    });

    it("should reject invalid session code formats", async () => {
      const invalidCodes = [
        "abc123", // lowercase
        "ABC12", // too short
        "ABC1234", // too long
        "ABC-123", // invalid character
        "ABC 123", // space
        "ABC_123", // underscore
        "ÄBC123", // special character
        "", // empty
        "abc", // too short and lowercase
        "12345", // too short
        "TOOLONG123", // too long
      ];

      invalidCodes.forEach((code) => {
        expect(isValidSessionCode(code)).toBe(false);
      });
    });

    it("should handle edge cases and null/undefined inputs", async () => {
      expect(isValidSessionCode(null as any)).toBe(false);
      expect(isValidSessionCode(undefined as any)).toBe(false);
      expect(isValidSessionCode(123456 as any)).toBe(false);
      expect(isValidSessionCode({} as any)).toBe(false);
      expect(isValidSessionCode([] as any)).toBe(false);
    });
  });

  describe("Business Logic Integration", () => {
    it("should work together in typical session creation workflow", async () => {
      // Step 1: Validate input
      const sessionInput = {
        title: "Integration Test Session",
        description: "Testing the complete workflow",
      };

      const validation = validateSessionInput(sessionInput);
      expect(validation.isValid).toBe(true);

      // Step 2: Generate unique code
      const sessionCode = await generateUniqueSessionCode(db);
      expect(isValidSessionCode(sessionCode)).toBe(true);

      // Step 3: Get expiration date
      const expiresAt = getSessionExpirationDate();
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

      // Step 4: Create session (simulated)
      const host = await db.user.create({
        data: {
          email: "integration@example.com",
          name: "Integration Test User",
        },
      });

      const session = await db.qaSession.create({
        data: {
          title: sessionInput.title,
          description: sessionInput.description,
          code: sessionCode,
          hostId: host.id,
          expiresAt,
        },
      });

      // Verify: Complete session creation
      expect(session).toMatchObject({
        title: sessionInput.title,
        description: sessionInput.description,
        code: sessionCode,
        hostId: host.id,
        isActive: true,
        isAcceptingQuestions: true,
      });

      expect(session.expiresAt.getTime()).toBe(expiresAt.getTime());
    });

    it("should maintain data consistency across multiple operations", async () => {
      const host = await db.user.create({
        data: {
          email: "consistency@example.com",
          name: "Consistency Test User",
        },
      });

      // Create multiple sessions with business logic
      const sessions = [];
      for (let i = 0; i < 10; i++) {
        const input = {
          title: `Consistency Test ${i + 1}`,
          description: `Session ${i + 1} for consistency testing`,
        };

        const validation = validateSessionInput(input);
        expect(validation.isValid).toBe(true);

        const code = await generateUniqueSessionCode(db);
        const expiresAt = getSessionExpirationDate();

        const session = await db.qaSession.create({
          data: {
            title: input.title,
            description: input.description,
            code,
            hostId: host.id,
            expiresAt,
          },
        });

        sessions.push(session);
      }

      // Verify: All sessions have unique codes
      const codes = sessions.map((s) => s.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);

      // Verify: All sessions have proper expiration dates
      sessions.forEach((session) => {
        expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
      });

      // Verify: All sessions follow business rules
      sessions.forEach((session) => {
        expect(session.title.length).toBeGreaterThanOrEqual(3);
        expect(session.title.length).toBeLessThanOrEqual(100);
        expect(isValidSessionCode(session.code)).toBe(true);
      });
    });
  });
});
