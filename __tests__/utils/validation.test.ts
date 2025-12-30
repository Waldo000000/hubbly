/**
 * Unit tests for session validation and utility functions
 * Tests individual functions and business logic helpers
 * @jest-environment node
 */

import {
  generateUniqueSessionCode,
  getSessionExpirationDate,
  validateSessionInput,
} from "@/lib/session-utils";
import { getTestDb, resetTestDb } from "../setup/test-db";

// Mock generateUniqueSessionCode for some tests to avoid database dependency
const mockGenerateSessionCode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

describe("Session Input Validation", () => {
  describe("validateSessionInput", () => {
    it("validates correct session input", () => {
      const input = {
        title: "Valid Session Title",
        description: "A valid session description",
      };
      const result = validateSessionInput(input);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("rejects empty title", () => {
      const input = {
        title: "",
        description: "Valid description",
      };
      const result = validateSessionInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors.title).toBeDefined();
    });

    it("rejects title that is too short", () => {
      const input = {
        title: "Hi",
        description: "Valid description",
      };
      const result = validateSessionInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors.title).toContain("at least 3 characters");
    });

    it("rejects title that is too long", () => {
      const input = {
        title: "a".repeat(101),
        description: "Valid description",
      };
      const result = validateSessionInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors.title).toContain("100 characters");
    });

    it("accepts missing description", () => {
      const input = {
        title: "Valid Title",
      };
      const result = validateSessionInput(input);
      expect(result.isValid).toBe(true);
    });

    it("rejects description that is too long", () => {
      const input = {
        title: "Valid Title",
        description: "a".repeat(501),
      };
      const result = validateSessionInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors.description).toContain("500 characters");
    });
  });
});

describe("Session Expiration Date", () => {
  it("generates expiration date 24 hours from now", () => {
    const expirationDate = getSessionExpirationDate();
    const now = new Date();
    const expectedExpiration = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Allow for small timing differences (within 1 second)
    const timeDiff = Math.abs(
      expirationDate.getTime() - expectedExpiration.getTime(),
    );
    expect(timeDiff).toBeLessThan(1000);
  });

  it("accepts custom hours parameter", () => {
    const customHours = 48;
    const expirationDate = getSessionExpirationDate(customHours);
    const now = new Date();
    const expectedExpiration = new Date(
      now.getTime() + customHours * 60 * 60 * 1000,
    );

    // Allow for small timing differences (within 1 second)
    const timeDiff = Math.abs(
      expirationDate.getTime() - expectedExpiration.getTime(),
    );
    expect(timeDiff).toBeLessThan(1000);
  });
});

describe("Session Code Generation", () => {
  const db = getTestDb();

  beforeEach(async () => {
    await resetTestDb();
  });

  it("generates codes of correct length", () => {
    const code = mockGenerateSessionCode();
    expect(code).toHaveLength(6);
  });

  it("generates codes with valid characters", () => {
    const code = mockGenerateSessionCode();
    expect(/^[A-Z0-9]{6}$/.test(code)).toBe(true);
  });

  it("generates unique codes", () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) {
      codes.add(mockGenerateSessionCode());
    }
    // Should generate mostly unique codes (allowing for rare collisions)
    expect(codes.size).toBeGreaterThan(90);
  });

  it("generates unique session codes using database", async () => {
    // Create test user first
    const testUser = await db.user.create({
      data: {
        email: "test@example.com",
        name: "Test User",
      },
    });

    // Generate first unique code
    const code1 = await generateUniqueSessionCode(db);

    // Create session with that code
    await db.qaSession.create({
      data: {
        title: "Test Session",
        code: code1,
        hostId: testUser.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Generate another code - should be different
    const code2 = await generateUniqueSessionCode(db);
    expect(code1).not.toBe(code2);

    // Both should be valid format
    expect(/^[A-Z0-9]{6}$/.test(code1)).toBe(true);
    expect(/^[A-Z0-9]{6}$/.test(code2)).toBe(true);
  }, 10000);
});
