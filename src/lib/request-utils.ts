/**
 * Request utility functions for extracting client information
 */

import { NextRequest } from "next/server";

/**
 * Extract client IP address from Next.js request
 * Handles various proxy headers (Vercel, Cloudflare, etc.)
 *
 * @param req - Next.js request object
 * @returns Client IP address or "unknown" if cannot be determined
 */
export function getClientIp(req: NextRequest): string {
  // Check common proxy headers in order of preference
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // Vercel-specific header
  const vercelForwardedFor = req.headers.get("x-vercel-forwarded-for");
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(",")[0].trim();
  }

  // Cloudflare header
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  // Fallback - in development this might be the actual client IP
  // In production behind a proxy, this will be the proxy's IP
  return "unknown";
}
