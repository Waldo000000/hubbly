# Security Review

**Date:** 2026-03-03
**Scope:** Comprehensive review across authentication, API endpoints, rate limiting, client-side security, and configuration.

---

## Critical

### 1. No HTTP Security Headers Configured

**File:** `next.config.js`

The application sends zero security headers — no CSP, no `X-Frame-Options`, no `X-Content-Type-Options`, no HSTS. This leaves the app vulnerable to clickjacking, MIME-sniffing attacks, and provides no mitigation if XSS is ever achieved.

**Production verification** (https://hubbly-gamma.vercel.app/):

| Header | Status |
|---|---|
| `Strict-Transport-Security` | Present (Vercel adds automatically) |
| `Content-Security-Policy` | Missing |
| `X-Frame-Options` | Missing |
| `X-Content-Type-Options` | Missing |
| `Referrer-Policy` | Missing |
| `Permissions-Policy` | Missing |
| `Access-Control-Allow-Origin` | Set to `*` (Vercel default for static/prerendered pages — allows any origin) |

**External assets that must be allowed in CSP `img-src`:**

1. **Google profile avatars** (`src/app/create/page.tsx:339`) — `session?.user?.image` loads from `https://lh3.googleusercontent.com`
2. **QR code API** (`src/app/session/[code]/host/page.tsx:181`) — `https://api.qrserver.com/v1/create-qr-code/...` used for session QR codes

All JS/CSS assets are self-hosted under `/_next/static/` — no CDN fonts, no external analytics, no third-party scripts. No issues with `script-src`, `style-src`, `connect-src`, or `font-src`.

**Local dev server considerations:**

The CSP must be environment-aware to avoid breaking local development:

- **`script-src`**: Next.js dev server uses `eval()` for fast refresh / HMR and source maps. Requires `'unsafe-eval'` in dev only.
- **`connect-src`**: Next.js dev uses a WebSocket (`ws://localhost:3000/_next/webpack-hmr`) for hot reloading. Must be allowed in dev only.
- Other headers (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) are safe in both environments. `Strict-Transport-Security` has no effect on `http://localhost`.

**Fix:** Add an environment-aware `headers()` function to `next.config.js`:

```js
const isDev = process.env.NODE_ENV === "development";

const cspValue = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://lh3.googleusercontent.com https://api.qrserver.com",
  `connect-src 'self'${isDev ? " ws://localhost:3000" : ""}`,
  "frame-ancestors 'none'",
].join("; ");

// Inside the Next.js config:
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Frame-Options", value: "DENY" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        { key: "Content-Security-Policy", value: cspValue },
      ],
    },
  ];
},
```

---

### 2. Client-Supplied Question ID Accepted as Database Primary Key

**File:** `src/app/api/sessions/[code]/questions/route.ts:121-132`

```typescript
...(body.id && { id: body.id }), // Use client ID if provided
```

The server accepts an unvalidated client-supplied `id` and uses it as the database PK. This enables:

- **ID collision attacks** — supplying an existing question's ID causes a 500 error
- **ID enumeration** — different error codes reveal whether IDs exist across sessions
- **No format validation** — any string is passed directly to Prisma

**Fix:** Remove client-supplied ID acceptance entirely. Generate IDs server-side. If optimistic UI correlation is needed, use a separate `clientTempId` field returned alongside the server-generated `id`.

---

### 3. `X-Forwarded-For` IP Spoofing Bypasses All Rate Limiting

**File:** `src/lib/request-utils.ts:16-19`

```typescript
const forwardedFor = req.headers.get("x-forwarded-for");
if (forwardedFor) {
  return forwardedFor.split(",")[0].trim();
}
```

The code blindly trusts the first entry in the client-controlled `X-Forwarded-For` header, checked _before_ trusted platform headers (`x-vercel-forwarded-for`). Any attacker can rotate through fake IPs to completely bypass all rate limiting.

**Fix:** Reorder to check `x-vercel-forwarded-for` first (infrastructure-set, non-spoofable on Vercel). Never trust raw `X-Forwarded-For` as the primary source.

```typescript
export function getClientIp(req: NextRequest): string {
  // Vercel's trusted header (infrastructure-set, cannot be spoofed by client)
  const vercelForwardedFor = req.headers.get("x-vercel-forwarded-for");
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(",")[0].trim();
  }

  // Cloudflare (if behind CF, CF sets this and it's trusted)
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  // Fallback - only trust if no upstream proxy
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return "unknown";
}
```

---

### 4. JWT Session Callback Reads Wrong Token Field

**File:** `src/lib/auth.ts:14-23`

The `jwt` callback stores the user ID as `token.uid`, but the `session` callback reads `token.sub`. These are different fields. `token.sub` is the OAuth provider's subject identifier (Google's numeric ID), which may not match the Prisma database user ID. This could cause all host ownership checks (`hostId === session.user.id`) to silently fail or pass incorrectly.

**Fix:** Use consistent field names — read `token.uid` in the session callback:

```typescript
session.user.id = (token.uid as string) ?? token.sub!;
```

---

## Important

### 5. Host Email Exposed to Unauthenticated Callers

**File:** `src/app/api/sessions/[code]/route.ts:36-42`

The public `GET /api/sessions/[code]` endpoint returns `host.email` to anyone with the session code. This is PII leakage — participants don't need the host's email.

**Fix:** Remove `email` from the `select` projection on the public GET.

---

### 6. `participantId` Exposed in Public Questions API Response

**File:** `src/app/api/sessions/[code]/questions/route.ts:229-231`

Every participant polling the question list receives the `participantId` UUID of every question submitter. Since `participantId` is the only identity token for vote deduplication, an attacker can read another participant's ID and use it to manipulate their votes (DELETE their votes, etc.).

**Fix:** Strip `participantId` from the public GET response. It serves no client display purpose.

---

### 7. No Rate Limiting on Session Code Lookup

**File:** `src/app/api/sessions/[code]/route.ts`

The public GET endpoint has no rate limiting, enabling brute-force enumeration of active session codes (36^6 combinations). Combined with issue #5, this enables automated email harvesting.

**Fix:** Apply `checkRateLimit` keyed on client IP before the DB query.

---

### 8. In-Memory Rate Limiting Ineffective in Serverless/Multi-Instance Deployments

**File:** `src/lib/rate-limit.ts:15`

```typescript
const rateLimitStore = new Map<string, RateLimitEntry>();
```

Each serverless function instance has its own empty `Map`. On Vercel, requests hit different cold instances, so the effective rate limit is `max * instance_count` (approaching unlimited). This is acknowledged in the code comments but means the entire rate limiting system provides near-zero protection in production.

**Fix (future):** Use Redis, Vercel KV, or Upstash for distributed rate limiting.

---

### 9. Client `maxCharacters` (100,000) Mismatches Server Validation (500)

**File:** `src/components/participant/QuestionSubmitForm.tsx:27` vs `src/types/question.ts:204`

The client-side form allows up to 100,000 characters, but the server rejects anything over 500. Users can type long questions that appear to submit (optimistic UI) then silently fail.

**Fix:** Import `QUESTION_VALIDATION.maxLength` in the form component instead of hardcoding.

---

### 10. `voteCount` Can Go Negative

**File:** `src/app/api/questions/[id]/vote/route.ts:201-218`

The unvote handler uses `decrement: 1` with no floor guard. Race conditions or data drift can produce negative vote counts. No database `CHECK` constraint prevents this.

**Fix:** Add `where: { voteCount: { gt: 0 } }` to the update, and add a DB-level constraint via migration: `CHECK (vote_count >= 0)`.

---

### 11. Middleware Doesn't Cover Host API Routes

**File:** `src/middleware.ts:15`

The matcher covers `/api/sessions` but not `/api/sessions/[code]/host/questions`, `/api/questions/[id]` (PATCH), or `/api/sessions/[code]` (PATCH). These routes perform in-handler auth checks, but lack the defense-in-depth layer the middleware is supposed to provide.

**Fix:** Expand the matcher to cover host-specific API routes:

```typescript
export const config = {
  matcher: [
    "/create/:path*",
    "/session/:path*/host/:path*",
    "/api/sessions",
    "/api/sessions/:code/host/:path*",
    "/api/questions/:id",
  ],
};
```

---

### 12. `isAnonymous` Not Type-Validated Before Database Write

**File:** `src/app/api/sessions/[code]/questions/route.ts:128`

Unlike the session PATCH endpoint which checks `typeof body.isActive === "boolean"`, the question submission endpoint passes `body.isAnonymous` directly to Prisma without type checking. A truthy string like `"false"` would be stored as truthy, silently inverting the author's privacy intent.

**Fix:** Add `typeof body.isAnonymous !== "boolean"` validation before the create call.

---

### 13. Weak `NEXTAUTH_SECRET` Placeholder

**File:** `.env.example:12`

The placeholder `"your-nextauth-secret-key"` is a guessable string visible in the public repo. If a developer copies `.env.example` to `.env.local` without replacing it, JWTs are signed with a known value, enabling session forgery.

**Fix:** Replace with `REPLACE_ME_run_openssl_rand_-base64_32` and add a generation command in the comment.

---

### 14. npm Dependencies With Known Vulnerabilities

**Audited:** 2026-03-03 — 6 vulnerabilities (3 high, 3 moderate)

| Package | Current | Fixed | Severity | Advisory |
|---|---|---|---|---|
| `next` | 15.5.9 | 15.5.12 | High | DoS via Image Optimizer `remotePatterns` ([GHSA-9g9p](https://github.com/advisories/GHSA-9g9p-9gw9-jx7f)), DoS via RSC deserialization ([GHSA-h25m](https://github.com/advisories/GHSA-h25m-26qc-wcjf)) |
| `next-auth` | 4.24.11 | 4.24.13 | Moderate | Email misdelivery vulnerability ([GHSA-5jpx](https://github.com/advisories/GHSA-5jpx-9hw9-2fx4)) |
| `minimatch` | 3.1.2 / 9.0.5 | 3.1.5 / 9.0.9 | High | Multiple ReDoS patterns ([GHSA-3ppc](https://github.com/advisories/GHSA-3ppc-4f35-3m26), [GHSA-7r86](https://github.com/advisories/GHSA-7r86-cg39-jmmj), [GHSA-23c5](https://github.com/advisories/GHSA-23c5-xmqv-rm74)) |
| `glob` | 10.4.5 | 10.5.0 | High | Command injection via `-c/--cmd` with `shell:true` ([GHSA-5j98](https://github.com/advisories/GHSA-5j98-mcp5-4vw2)) |
| `js-yaml` | 3.14.1 / 4.1.0 | 3.14.2 / 4.1.1 | Moderate | Prototype pollution in merge (`<<`) ([GHSA-mh29](https://github.com/advisories/GHSA-mh29-5h37-fv8m)) |
| `ajv` | 6.12.6 | 6.14.0 | Moderate | ReDoS when using `$data` option ([GHSA-2g4f](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6)) |

All vulnerabilities are in transitive dependencies of Jest, ESLint, Next.js, and NextAuth. All are fixable with non-breaking patch updates.

**Fix:** Run `npm audit fix` — dry run confirms only patch/minor version bumps, no breaking changes.

---

## What Looks Good

- **No XSS vectors**: Zero uses of `dangerouslySetInnerHTML`. All user content rendered via React JSX auto-escaping.
- **No SQL injection**: All DB access through Prisma's typed query builder, no `$queryRaw` usage.
- **Proper host ownership checks**: All host-mutating endpoints verify `hostId === session.user.id`.
- **Database-level deduplication**: Unique constraints on `(questionId, participantId)` for votes and pulse checks.
- **TypeScript strict mode enabled**: `tsconfig.json` has `"strict": true`.
- **Generic error responses**: 500 handlers return generic messages, not stack traces.
- **Cascade deletes properly scoped**: Schema relationships correctly cascade.
