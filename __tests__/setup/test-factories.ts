/**
 * Test Data Factories
 *
 * Factory functions for creating consistent test data
 */

import {
  PrismaClient,
  User,
  QaSession,
  Question,
  Vote,
} from "@prisma/test-client";
import { generateUniqueSessionCode } from "@/lib/session-utils";

/**
 * Factory for creating test users
 */
export class UserFactory {
  static create(db: PrismaClient, overrides: Partial<User> = {}) {
    const timestamp = Date.now();
    return db.user.create({
      data: {
        email: `testuser${timestamp}@example.com`,
        name: `Test User ${timestamp}`,
        image: `https://example.com/avatar${timestamp}.png`,
        ...overrides,
      },
    });
  }

  static createMany(
    db: PrismaClient,
    count: number,
    overrides: Partial<User> = {},
  ) {
    const users = Array.from({ length: count }, (_, i) => ({
      email: `testuser${Date.now()}_${i}@example.com`,
      name: `Test User ${i + 1}`,
      image: `https://example.com/avatar${i}.png`,
      ...overrides,
    }));

    return db.user.createMany({
      data: users,
      skipDuplicates: true,
    });
  }
}

/**
 * Factory for creating test Q&A sessions
 */
export class SessionFactory {
  static async create(
    db: PrismaClient,
    overrides: Partial<QaSession & { hostId: string }> = {},
  ) {
    const code = await generateUniqueSessionCode(db);
    const timestamp = Date.now();

    return db.qaSession.create({
      data: {
        title: `Test Session ${timestamp}`,
        description: `Test description for session ${timestamp}`,
        code,
        hostId: overrides.hostId || "", // Must be provided
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        ...overrides,
      },
    });
  }

  static async createWithHost(
    db: PrismaClient,
    overrides: Partial<QaSession> = {},
  ) {
    const host = await UserFactory.create(db);
    return this.create(db, { ...overrides, hostId: host.id });
  }
}

/**
 * Factory for creating test questions
 */
export class QuestionFactory {
  static create(
    db: PrismaClient,
    sessionId: string,
    overrides: Partial<Question> = {},
  ) {
    const timestamp = Date.now();

    return db.question.create({
      data: {
        content: `Test question content ${timestamp}?`,
        sessionId,
        authorName: Math.random() > 0.5 ? `Anonymous ${timestamp}` : null,
        voteCount: Math.floor(Math.random() * 10),
        status: "pending",
        isAnonymous: true,
        ...overrides,
      },
    });
  }

  static createMany(
    db: PrismaClient,
    sessionId: string,
    count: number,
    overrides: Partial<Question> = {},
  ) {
    const questions = Array.from({ length: count }, (_, i) => ({
      content: `Test question ${i + 1}: What about this topic?`,
      sessionId,
      authorName: i % 2 === 0 ? `Test User ${i}` : null,
      voteCount: Math.floor(Math.random() * 20),
      status: ["pending", "approved", "dismissed", "answered"][i % 4] as any,
      isAnonymous: i % 2 === 1,
      ...overrides,
    }));

    return db.question.createMany({
      data: questions,
      skipDuplicates: true,
    });
  }
}

/**
 * Factory for creating test votes
 */
export class VoteFactory {
  static create(
    db: PrismaClient,
    questionId: string,
    overrides: Partial<Vote> = {},
  ) {
    const timestamp = Date.now();

    return db.vote.create({
      data: {
        questionId,
        voterIp: `192.168.1.${Math.floor(Math.random() * 255)}`,
        ...overrides,
      },
    });
  }

  static createMany(db: PrismaClient, questionId: string, count: number) {
    const votes = Array.from({ length: count }, (_, i) => ({
      questionId,
      voterIp: `192.168.1.${i + 1}`, // Unique IPs for testing
    }));

    return db.vote.createMany({
      data: votes,
      skipDuplicates: true,
    });
  }
}

/**
 * Factory for creating complete test scenarios
 */
export class ScenarioFactory {
  /**
   * Create a complete test scenario with host, session, questions, and votes
   */
  static async createCompleteSession(db: PrismaClient) {
    // Create host user
    const host = await UserFactory.create(db, {
      name: "Session Host",
      email: "host@example.com",
    });

    // Create Q&A session
    const session = await SessionFactory.create(db, {
      hostId: host.id,
      title: "Complete Test Session",
      description: "A full session for testing",
    });

    // Create questions
    await QuestionFactory.createMany(db, session.id, 5, {
      status: "approved",
    });

    const questions = await db.question.findMany({
      where: { sessionId: session.id },
    });

    // Add votes to questions
    for (const question of questions) {
      await VoteFactory.createMany(
        db,
        question.id,
        Math.floor(Math.random() * 10) + 1,
      );
    }

    // Update vote counts
    for (const question of questions) {
      const voteCount = await db.vote.count({
        where: { questionId: question.id },
      });
      await db.question.update({
        where: { id: question.id },
        data: { voteCount },
      });
    }

    return {
      host,
      session,
      questions: await db.question.findMany({
        where: { sessionId: session.id },
        include: { votes: true },
      }),
    };
  }
}
