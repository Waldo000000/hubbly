/**
 * Simple in-memory rate limiting utility
 *
 * For production at scale, consider using Redis or a dedicated rate limiting service.
 * This implementation is suitable for MVP and moderate traffic.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limit tracking
// Key format: `{action}:{identifier}` (e.g., "submit-question:192.168.1.1")
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes to prevent memory leaks
setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetAt < now) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

export interface RateLimitConfig {
  /** Maximum number of requests allowed */
  max: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Current request count in the window */
  current: number;
  /** Maximum allowed requests */
  limit: number;
  /** When the rate limit will reset (Unix timestamp in ms) */
  resetAt: number;
  /** Time remaining until reset in seconds */
  retryAfter?: number;
}

/**
 * Check if a request should be rate limited
 *
 * @param action - The action being rate limited (e.g., "submit-question", "vote")
 * @param identifier - Unique identifier (e.g., IP address, participant ID)
 * @param config - Rate limit configuration
 * @returns Rate limit result indicating if request is allowed
 */
export function checkRateLimit(
  action: string,
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  const key = `${action}:${identifier}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Create new entry if doesn't exist or has expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      current: 1,
      limit: config.max,
      resetAt: entry.resetAt,
    };
  }

  // Increment counter
  entry.count++;

  // Check if limit exceeded
  if (entry.count > config.max) {
    const retryAfterMs = entry.resetAt - now;
    const retryAfterSec = Math.ceil(retryAfterMs / 1000);

    return {
      allowed: false,
      current: entry.count,
      limit: config.max,
      resetAt: entry.resetAt,
      retryAfter: retryAfterSec,
    };
  }

  return {
    allowed: true,
    current: entry.count,
    limit: config.max,
    resetAt: entry.resetAt,
  };
}

/**
 * Get rate limit headers for HTTP responses
 * Follows standard rate limit header conventions
 */
export function getRateLimitHeaders(
  result: RateLimitResult,
): Record<string, string> {
  const headers: Record<string, string> = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": Math.max(
      0,
      result.limit - result.current,
    ).toString(),
    "X-RateLimit-Reset": Math.floor(result.resetAt / 1000).toString(),
  };

  if (result.retryAfter !== undefined) {
    headers["Retry-After"] = result.retryAfter.toString();
  }

  return headers;
}

/**
 * Rate limit configurations for different actions
 */
export const RATE_LIMITS = {
  SUBMIT_QUESTION: {
    max: 5,
    windowMs: 5 * 60 * 1000, // 5 minutes
  },
  VOTE: {
    max: 30,
    windowMs: 60 * 1000, // 1 minute
  },
  PULSE_CHECK: {
    max: 20,
    windowMs: 60 * 1000, // 1 minute
  },
} as const;
