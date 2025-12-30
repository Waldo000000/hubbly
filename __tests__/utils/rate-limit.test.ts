/**
 * Rate Limit Utility Tests
 * Tests rate limiting business logic for API security
 */

import {
  checkRateLimit,
  getRateLimitHeaders,
  RATE_LIMITS,
} from "@/lib/rate-limit";

describe("Rate Limit Utility", () => {
  describe("checkRateLimit", () => {
    it("should allow first request within limit", () => {
      const result = checkRateLimit("test-action", "test-id", {
        max: 5,
        windowMs: 60000,
      });

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
      expect(result.limit).toBe(5);
      expect(result.resetAt).toBeGreaterThan(Date.now());
      expect(result.retryAfter).toBeUndefined();
    });

    it("should track multiple requests within window", () => {
      const config = { max: 3, windowMs: 60000 };

      const result1 = checkRateLimit("test-multi", "user1", config);
      expect(result1.allowed).toBe(true);
      expect(result1.current).toBe(1);

      const result2 = checkRateLimit("test-multi", "user1", config);
      expect(result2.allowed).toBe(true);
      expect(result2.current).toBe(2);

      const result3 = checkRateLimit("test-multi", "user1", config);
      expect(result3.allowed).toBe(true);
      expect(result3.current).toBe(3);
    });

    it("should deny request when limit exceeded", () => {
      const config = { max: 2, windowMs: 60000 };

      checkRateLimit("test-deny", "user2", config); // 1
      checkRateLimit("test-deny", "user2", config); // 2
      const result = checkRateLimit("test-deny", "user2", config); // 3 - should deny

      expect(result.allowed).toBe(false);
      expect(result.current).toBe(3);
      expect(result.limit).toBe(2);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it("should isolate rate limits by action", () => {
      const config = { max: 2, windowMs: 60000 };

      checkRateLimit("action1", "user3", config);
      checkRateLimit("action1", "user3", config);

      // Different action should have separate limit
      const result = checkRateLimit("action2", "user3", config);
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
    });

    it("should isolate rate limits by identifier", () => {
      const config = { max: 2, windowMs: 60000 };

      checkRateLimit("action3", "user4", config);
      checkRateLimit("action3", "user4", config);

      // Different user should have separate limit
      const result = checkRateLimit("action3", "user5", config);
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
    });

    it("should reset after time window expires", async () => {
      const config = { max: 2, windowMs: 100 }; // 100ms window

      // Use up the limit
      checkRateLimit("test-reset", "user6", config);
      checkRateLimit("test-reset", "user6", config);
      const denied = checkRateLimit("test-reset", "user6", config);
      expect(denied.allowed).toBe(false);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should be allowed again
      const result = checkRateLimit("test-reset", "user6", config);
      expect(result.allowed).toBe(true);
      expect(result.current).toBe(1);
    });

    it("should calculate correct retry-after seconds", () => {
      const config = { max: 1, windowMs: 5000 };

      checkRateLimit("test-retry", "user7", config);
      const result = checkRateLimit("test-retry", "user7", config);

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeLessThanOrEqual(5);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe("getRateLimitHeaders", () => {
    it("should return standard rate limit headers for allowed request", () => {
      const result = {
        allowed: true,
        current: 3,
        limit: 10,
        resetAt: Date.now() + 60000,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers["X-RateLimit-Limit"]).toBe("10");
      expect(headers["X-RateLimit-Remaining"]).toBe("7");
      expect(headers["X-RateLimit-Reset"]).toBeDefined();
      expect(headers["Retry-After"]).toBeUndefined();
    });

    it("should return retry-after header when limit exceeded", () => {
      const result = {
        allowed: false,
        current: 11,
        limit: 10,
        resetAt: Date.now() + 60000,
        retryAfter: 60,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers["X-RateLimit-Limit"]).toBe("10");
      expect(headers["X-RateLimit-Remaining"]).toBe("0");
      expect(headers["Retry-After"]).toBe("60");
    });

    it("should never show negative remaining", () => {
      const result = {
        allowed: false,
        current: 15,
        limit: 10,
        resetAt: Date.now() + 60000,
        retryAfter: 30,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers["X-RateLimit-Remaining"]).toBe("0");
    });
  });

  describe("RATE_LIMITS configuration", () => {
    it("should define submit question rate limit", () => {
      expect(RATE_LIMITS.SUBMIT_QUESTION).toBeDefined();
      expect(RATE_LIMITS.SUBMIT_QUESTION.max).toBe(5);
      expect(RATE_LIMITS.SUBMIT_QUESTION.windowMs).toBe(5 * 60 * 1000);
    });

    it("should define vote rate limit", () => {
      expect(RATE_LIMITS.VOTE).toBeDefined();
      expect(RATE_LIMITS.VOTE.max).toBe(30);
      expect(RATE_LIMITS.VOTE.windowMs).toBe(60 * 1000);
    });

    it("should define pulse check rate limit", () => {
      expect(RATE_LIMITS.PULSE_CHECK).toBeDefined();
      expect(RATE_LIMITS.PULSE_CHECK.max).toBe(20);
      expect(RATE_LIMITS.PULSE_CHECK.windowMs).toBe(60 * 1000);
    });
  });
});
