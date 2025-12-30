/**
 * Simple End-to-End Session Lifecycle Test
 * Tests core business logic workflows without HTTP complexity
 * @jest-environment node
 */

import { getTestDb, resetTestDb, closeTestDb } from "../setup/test-db";
import {
  generateUniqueSessionCode,
  validateSessionInput,
  getSessionExpirationDate,
} from "@/lib/session-utils";

describe("Session Lifecycle (Business Logic)", () => {
  const db = getTestDb();

  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("should complete basic session lifecycle workflow", async () => {
    // Step 1: Create a host user
    const host = await db.user.create({
      data: {
        email: "host@example.com",
        name: "Session Host",
      },
    });

    // Step 2: Validate session input (business rule)
    const sessionInput = {
      title: "Test Session",
      description: "A test session for lifecycle validation",
    };

    const validation = validateSessionInput(sessionInput);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toEqual({});

    // Step 3: Generate unique session code (business rule)
    const sessionCode = await generateUniqueSessionCode(db);
    expect(sessionCode).toMatch(/^[A-Z0-9]{6}$/);

    // Step 4: Create session with business rules applied
    const expiresAt = getSessionExpirationDate();
    const session = await db.qaSession.create({
      data: {
        title: sessionInput.title,
        description: sessionInput.description,
        code: sessionCode,
        hostId: host.id,
        expiresAt,
      },
    });

    // Step 5: Verify session was created correctly (business logic verification)
    expect(session).toMatchObject({
      title: sessionInput.title,
      description: sessionInput.description,
      code: sessionCode,
      hostId: host.id,
      isActive: true,
      isAcceptingQuestions: true,
    });

    // Step 6: Retrieve session by code (key business workflow)
    const retrievedSession = await db.qaSession.findUnique({
      where: { code: sessionCode },
      include: { host: true },
    });

    expect(retrievedSession).toBeTruthy();
    expect(retrievedSession?.host.email).toBe("host@example.com");
    expect(retrievedSession?.code).toBe(sessionCode);

    // Step 7: Verify session expiration business rule
    const now = new Date();
    expect(retrievedSession?.expiresAt.getTime()).toBeGreaterThan(
      now.getTime(),
    );

    // Session should expire approximately 24 hours from now
    const expectedExpiration = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const timeDifference = Math.abs(
      retrievedSession!.expiresAt.getTime() - expectedExpiration.getTime(),
    );
    expect(timeDifference).toBeLessThan(10000); // Within 10 seconds
  });

  it("should handle session code uniqueness (critical business rule)", async () => {
    // Create a host user
    const host = await db.user.create({
      data: {
        email: "host@example.com",
        name: "Test Host",
      },
    });

    // Create first session
    const code1 = await generateUniqueSessionCode(db);
    await db.qaSession.create({
      data: {
        title: "Session 1",
        code: code1,
        hostId: host.id,
        expiresAt: getSessionExpirationDate(),
      },
    });

    // Generate second code should be different (uniqueness rule)
    const code2 = await generateUniqueSessionCode(db);
    expect(code1).not.toBe(code2);

    // Both codes should be valid format
    expect(code1).toMatch(/^[A-Z0-9]{6}$/);
    expect(code2).toMatch(/^[A-Z0-9]{6}$/);
  });

  it("should validate session input according to business rules", async () => {
    // Valid input should pass
    const validInput = {
      title: "Valid Session Title",
      description: "Valid description",
    };
    expect(validateSessionInput(validInput).isValid).toBe(true);

    // Invalid inputs should fail according to business rules
    expect(validateSessionInput({ title: "" }).isValid).toBe(false);
    expect(validateSessionInput({ title: "AB" }).isValid).toBe(false); // Too short
    expect(validateSessionInput({ title: "a".repeat(101) }).isValid).toBe(
      false,
    ); // Too long

    const longDescInput = {
      title: "Valid Title",
      description: "a".repeat(501), // Too long description
    };
    expect(validateSessionInput(longDescInput).isValid).toBe(false);
  });
});
