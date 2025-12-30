/**
 * Request Utilities Tests
 * Tests IP extraction logic from proxy headers
 * @jest-environment node
 */

import { getClientIp } from "@/lib/request-utils";
import { NextRequest } from "next/server";

describe("Request Utilities", () => {
  describe("getClientIp", () => {
    it("should extract IP from x-forwarded-for header", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {
          "x-forwarded-for": "203.0.113.1, 198.51.100.1",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("203.0.113.1");
    });

    it("should extract IP from x-real-ip header", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {
          "x-real-ip": "203.0.113.2",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("203.0.113.2");
    });

    it("should extract IP from x-vercel-forwarded-for header", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {
          "x-vercel-forwarded-for": "203.0.113.3, 198.51.100.2",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("203.0.113.3");
    });

    it("should extract IP from cf-connecting-ip header (Cloudflare)", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {
          "cf-connecting-ip": "203.0.113.4",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("203.0.113.4");
    });

    it("should prioritize x-forwarded-for over other headers", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {
          "x-forwarded-for": "203.0.113.5",
          "x-real-ip": "203.0.113.6",
          "cf-connecting-ip": "203.0.113.7",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("203.0.113.5");
    });

    it("should prioritize x-real-ip over vercel and cloudflare headers", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {
          "x-real-ip": "203.0.113.8",
          "x-vercel-forwarded-for": "203.0.113.9",
          "cf-connecting-ip": "203.0.113.10",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("203.0.113.8");
    });

    it("should prioritize x-vercel-forwarded-for over cloudflare header", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {
          "x-vercel-forwarded-for": "203.0.113.11",
          "cf-connecting-ip": "203.0.113.12",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("203.0.113.11");
    });

    it("should return 'unknown' when no IP headers present", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {},
      });

      const ip = getClientIp(request);
      expect(ip).toBe("unknown");
    });

    it("should trim whitespace from extracted IP", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {
          "x-forwarded-for": "  203.0.113.13  , 198.51.100.3",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("203.0.113.13");
    });

    it("should handle single IP in x-forwarded-for", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {
          "x-forwarded-for": "203.0.113.14",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("203.0.113.14");
    });

    it("should handle IPv6 addresses", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {
          "x-forwarded-for": "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    });

    it("should take first IP from comma-separated list in x-vercel-forwarded-for", () => {
      const request = new NextRequest("http://localhost/api/test", {
        headers: {
          "x-vercel-forwarded-for": "203.0.113.15, 198.51.100.4, 192.0.2.1",
        },
      });

      const ip = getClientIp(request);
      expect(ip).toBe("203.0.113.15");
    });
  });
});
