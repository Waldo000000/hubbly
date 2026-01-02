# Migration Plan: Full Supabase Stack

## Executive Summary

This document outlines the migration from the current stack (Prisma + NextAuth) to a full Supabase stack (Supabase Client + Supabase Auth). This migration achieves three goals simultaneously:

1. ✅ **RLS Security**: COMPLETED - Enabled on all tables with postgres role BYPASSRLS
2. 🎯 **Realtime Updates**: IN PROGRESS - Native Supabase Realtime (no polling)
3. ✅ **Common Stack**: Industry-standard Supabase + Next.js architecture

**Learning Note**: During implementation, I will explain each step in detail so you can understand Supabase patterns, best practices, and how everything fits together.

## Current Status (Updated 2026-01-02)

**✅ Completed:**
- RLS enabled on all 9 public tables (including `_prisma_migrations`)
- Database is secured (anon key access blocked, postgres role bypasses RLS)
- All 157 tests passing
- 10-second polling for cross-user updates (functional but not ideal)

**🚧 Current Issue:**
- Polling + optimistic updates = race conditions and ordering glitches
- Need true realtime to eliminate polling conflicts

**🎯 Next Steps:**
- Migrate to Supabase Client SDK + Auth (Phases 0-2)
- Implement proper RLS policies for client-side queries (Phase 3)
- Add Supabase Realtime subscriptions (Phase 4)

## Current State vs Target State

### Current Stack

```
Next.js 15 (App Router)
  ↓
NextAuth.js (Google OAuth)
  ↓
Prisma ORM
  ↓
Supabase (as Postgres host only)
```

### Target Stack

```
Next.js 15 (App Router)
  ↓
Supabase Auth (Google OAuth)
  ↓
@supabase/supabase-js + @supabase/ssr
  ↓
Supabase (full platform: DB + Auth + Realtime + RLS)
```

## Benefits of Migration

### 1. RLS "Just Works"

- Supabase Auth automatically integrates with RLS
- `auth.uid()` in policies maps to authenticated user
- No service role bypass hacks needed

### 2. Realtime Included

- Subscribe to database changes from client
- True instant updates (no 10-second polling)
- Built for the exact use case (Q&A, live voting)

### 3. Simpler Architecture

- One vendor, one client library, one mental model
- Well-documented patterns (official Supabase + Next.js docs)
- Large community support

### 4. Better Performance

- Connection pooling built-in
- Realtime uses WebSockets (more efficient than polling)
- PostgREST API optimized for Supabase

## Migration Scope

### Files to Modify/Remove

**Remove (no longer needed):**

- `src/lib/auth.ts` (NextAuth config)
- `src/app/api/auth/[...nextauth]/route.ts` (NextAuth API route)
- `src/types/next-auth.d.ts` (NextAuth type extensions)

**Create (new Supabase setup):**

- `src/lib/supabase/server.ts` (Server-side Supabase client)
- `src/lib/supabase/client.ts` (Client-side Supabase client)
- `src/lib/supabase/middleware.ts` (Auth refresh in middleware)
- `src/app/auth/callback/route.ts` (OAuth callback handler)
- `src/components/AuthButton.tsx` (Sign in/out UI)

**Modify (replace Prisma with Supabase queries):**

- All API routes (~12 files in `src/app/api/`)
- `src/middleware.ts` (auth check)
- Client components using data (~6 files)
- Session management in pages

**Update (configuration):**

- `.env.local` (add Supabase keys, remove NextAuth vars)
- `package.json` (swap dependencies)
- `tsconfig.json` (may need path adjustments)

### Database Schema Changes

**Good News**: No schema migration needed! Keep your existing tables:

- `users`
- `qa_sessions`
- `questions`
- `votes`
- `pulse_check_feedback`
- `accounts`, `sessions`, `verification_tokens` (NextAuth tables can stay for now)

**Add**: Supabase Auth will create its own tables in `auth` schema (separate from your `public` schema)

## Phase-by-Phase Implementation Plan

### ✅ Phase -1: RLS Security (COMPLETED)

**Status**: COMPLETED 2026-01-02

**What Was Done:**
- Enabled RLS on all 9 public tables
- Verified postgres role has BYPASSRLS privilege
- All Prisma operations continue to work (bypass RLS)
- Client SDK anon key access is blocked
- Two migrations created and deployed:
  - `20260102000000_enable_rls_security` - 8 tables
  - `20260102000001_enable_rls_prisma_migrations` - _prisma_migrations table

**Result**: Database is secure. Ready for Supabase stack migration.

---

### Phase 0: Preparation (1 hour) - NEXT STEP

**Goal**: Set up Supabase Auth, verify it works before touching application code

**Steps**:

1. **Enable Supabase Auth in Dashboard**
   - Navigate to Supabase Dashboard → Authentication → Providers
   - Enable Google provider
   - Add OAuth credentials (same as your current NextAuth setup)
   - Set redirect URLs: `http://localhost:3000/auth/callback`, `https://your-domain.vercel.app/auth/callback`

2. **Get Supabase Credentials**
   - Dashboard → Settings → API
   - Copy `SUPABASE_URL`
   - Copy `anon` public key (safe for client-side)
   - Copy `service_role` key (server-side only, never expose)

3. **Update Environment Variables**

   ```env
   # Add these:
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

   # Keep DATABASE_URL for now (we'll use it for migrations)
   DATABASE_URL=...

   # Can remove later after migration complete:
   # NEXTAUTH_URL, NEXTAUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
   ```

4. **Install Dependencies**

   ```bash
   npm install @supabase/supabase-js @supabase/ssr
   npm uninstall next-auth @auth/prisma-adapter  # Remove after migration complete
   # Keep Prisma for now (useful for data migrations if needed)
   ```

5. **Create Branch**
   ```bash
   git checkout -b feature/supabase-migration
   ```

### Phase 1: Supabase Client Setup (1 hour)

**Goal**: Create reusable Supabase client utilities

**Files to Create**:

#### `src/lib/supabase/client.ts` (Client-side)

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

**Learning Note**:

- `createBrowserClient` handles cookies automatically in browser
- Uses `anon` key (safe for client-side)
- RLS enforces permissions, so leaking this key is safe

#### `src/lib/supabase/server.ts` (Server-side for API routes and Server Components)

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Called from Server Component, can't set cookies
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            // Called from Server Component, can't remove cookies
          }
        },
      },
    },
  );
}

// Helper to get current user server-side
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  return user;
}
```

**Learning Note**:

- Server client reads auth cookies set by browser
- `getUser()` validates JWT and returns user info
- If invalid/expired, returns null (not an error)

#### `src/lib/supabase/middleware.ts` (Middleware helper)

```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  // Refresh session if expired
  await supabase.auth.getUser();

  return response;
}
```

**Learning Note**:

- Middleware runs on every request
- Refreshes auth tokens automatically
- Sets new cookies with refreshed session

### Phase 2: Authentication Migration (2 hours)

**Goal**: Replace NextAuth with Supabase Auth, get login working

#### Step 1: Create OAuth Callback Route

**File**: `src/app/auth/callback/route.ts`

```typescript
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to home page after successful login
  return NextResponse.redirect(`${origin}/`);
}
```

**Learning Note**:

- OAuth providers redirect to this route with `code` parameter
- `exchangeCodeForSession` trades code for JWT tokens
- Sets auth cookies automatically

#### Step 2: Update Middleware

**File**: `src/middleware.ts`

```typescript
import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Refresh auth session
  const response = await updateSession(request);

  // Protected routes (require authentication)
  const protectedRoutes = ["/create", "/session/[^/]+/host"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    new RegExp(`^${route}$`).test(request.nextUrl.pathname),
  );

  if (isProtectedRoute) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Redirect to home with error message
      return NextResponse.redirect(
        new URL("/?error=auth_required", request.url),
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

#### Step 3: Create Auth UI Component

**File**: `src/components/AuthButton.tsx`

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  if (loading) {
    return <button disabled>Loading...</button>
  }

  if (user) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span>{user.email}</span>
        <button onClick={signOut}>Sign Out</button>
      </div>
    )
  }

  return <button onClick={signIn}>Sign In with Google</button>
}
```

**Learning Note**:

- `signInWithOAuth` triggers Google OAuth flow
- `onAuthStateChange` listens for login/logout events
- Client-side code uses browser client

#### Step 4: Update Pages with Auth Button

Replace NextAuth `SessionProvider` usage with `AuthButton` component:

**File**: `src/app/page.tsx` (add to header/nav)

```typescript
import { AuthButton } from '@/components/AuthButton'

export default function HomePage() {
  return (
    <main>
      {/* Add to navigation/header */}
      <nav>
        <AuthButton />
      </nav>

      {/* Rest of your page... */}
    </main>
  )
}
```

**Test Checkpoint**:

- Run app, click "Sign In with Google"
- Should redirect to Google OAuth
- Should redirect back and show user email
- Check Supabase Dashboard → Authentication → Users (should see your user)

### Phase 3: Database Query Migration (3-4 hours)

**Goal**: Replace all Prisma queries with Supabase queries

**Pattern for API Routes**:

#### Before (Prisma):

```typescript
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const questions = await prisma.question.findMany({
    where: {
      sessionId: "abc123",
      status: "approved",
    },
    orderBy: { voteCount: "desc" },
  });

  return Response.json(questions);
}
```

#### After (Supabase):

```typescript
import { createClient } from "@/lib/supabase/server";

export async function GET(req: Request) {
  const supabase = await createClient();

  const { data: questions, error } = await supabase
    .from("questions")
    .select("*")
    .eq("session_id", "abc123")
    .eq("status", "approved")
    .order("vote_count", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(questions);
}
```

**Key Differences**:

- `.from('table_name')` instead of `prisma.tableName`
- `.select('*')` to get all columns (or specify: `.select('id, content, vote_count')`)
- `.eq()` instead of `where: { field: value }`
- `.order()` instead of `orderBy`
- Snake_case for column names (as in DB) vs camelCase (Prisma)
- Returns `{ data, error }` tuple instead of throwing

#### Migration Pattern for All API Routes

**Files to migrate** (in order of priority):

1. **Session Creation** - `src/app/api/sessions/route.ts` (POST)
   - Replace Prisma user creation/lookup
   - Use `user.id` from `supabase.auth.getUser()`

2. **Session Retrieval** - `src/app/api/sessions/[code]/route.ts` (GET, PATCH)
   - Replace Prisma session queries
   - Verify ownership using `user.id === session.host_id`

3. **Question Submission** - `src/app/api/sessions/[code]/questions/route.ts` (POST, GET)
   - Replace Prisma question creation
   - Note: Anonymous users can insert (RLS will allow)

4. **Host Questions** - `src/app/api/sessions/[code]/host/questions/route.ts` (GET)
   - Replace Prisma query for all questions
   - RLS policy will filter to host's sessions automatically

5. **Question Status Update** - `src/app/api/questions/[id]/route.ts` (PATCH)
   - Replace Prisma update
   - RLS will enforce host-only updates

6. **Voting** - `src/app/api/questions/[id]/vote/route.ts` (POST, DELETE)
   - Replace Prisma vote creation/deletion
   - Anonymous users can vote (RLS allows)

7. **Pulse Check** - `src/app/api/questions/[id]/pulse/route.ts` (POST)
   - Replace Prisma feedback creation
   - Anonymous users can submit (RLS allows)

**Query Translation Cheat Sheet**:

| Prisma                                                  | Supabase                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `prisma.table.findMany({ where: { field: 'value' } })`  | `supabase.from('table').select('*').eq('field', 'value')`               |
| `prisma.table.findUnique({ where: { id: '123' } })`     | `supabase.from('table').select('*').eq('id', '123').single()`           |
| `prisma.table.create({ data: { ... } })`                | `supabase.from('table').insert({ ... }).select().single()`              |
| `prisma.table.update({ where: { id }, data: { ... } })` | `supabase.from('table').update({ ... }).eq('id', id).select().single()` |
| `prisma.table.delete({ where: { id } })`                | `supabase.from('table').delete().eq('id', id)`                          |
| `where: { field: { in: [...] } }`                       | `.in('field', [...])`                                                   |
| `where: { field: { not: 'value' } }`                    | `.neq('field', 'value')`                                                |
| `where: { field: { gt: 5 } }`                           | `.gt('field', 5)`                                                       |
| `include: { relation: true }`                           | `.select('*, relation(*)')`                                             |
| `orderBy: { field: 'asc' }`                             | `.order('field', { ascending: true })`                                  |

**Authentication in API Routes**:

```typescript
// Get current user
const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}

// Use user.id for host checks, user creation, etc.
console.log(user.id, user.email);
```

### Phase 4: Update RLS Policies for Client Access (1-2 hours)

**Goal**: Update RLS policies to allow client-side queries (currently RLS enabled but no policies)

**Current State**: RLS is enabled with zero policies (only postgres role with BYPASSRLS can access)

**What We Need**: Add policies to allow Supabase Client SDK (anon key) to read approved questions, insert questions, etc.

**Run in Supabase SQL Editor** (Dashboard → SQL Editor → New Query):

```sql
-- Note: RLS is already enabled on all tables
-- Now we just need to add policies to allow client-side access

-- Users table policies
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- QA Sessions policies
CREATE POLICY "Anyone can read active sessions"
  ON qa_sessions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Authenticated users can create sessions"
  ON qa_sessions FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update own sessions"
  ON qa_sessions FOR UPDATE
  USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete own sessions"
  ON qa_sessions FOR DELETE
  USING (auth.uid() = host_id);

-- Questions policies
CREATE POLICY "Anyone can read approved questions"
  ON questions FOR SELECT
  USING (status IN ('approved', 'answered', 'being_answered'));

CREATE POLICY "Hosts can read all questions for own sessions"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM qa_sessions
      WHERE qa_sessions.id = questions.session_id
      AND qa_sessions.host_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can submit questions"
  ON questions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Hosts can update questions for own sessions"
  ON questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM qa_sessions
      WHERE qa_sessions.id = questions.session_id
      AND qa_sessions.host_id = auth.uid()
    )
  );

-- Votes policies
CREATE POLICY "Anyone can read votes"
  ON votes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can vote"
  ON votes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete votes"
  ON votes FOR DELETE
  USING (true);  -- Application enforces uniqueness

-- Pulse Check Feedback policies
CREATE POLICY "Anyone can read pulse check feedback"
  ON pulse_check_feedback FOR SELECT
  USING (true);

CREATE POLICY "Anyone can submit pulse check feedback"
  ON pulse_check_feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update pulse check feedback"
  ON pulse_check_feedback FOR UPDATE
  USING (true);  -- Application enforces participant_id match
```

**Learning Note**:

- `auth.uid()` returns the authenticated user's ID from JWT
- `USING` clause = row visibility for SELECT, UPDATE, DELETE
- `WITH CHECK` clause = row validity for INSERT, UPDATE
- Policies are additive (OR logic) - if any policy allows, operation succeeds

**Test Checkpoint**:

- Try creating a session as authenticated user ✅
- Try updating another user's session ❌ (should fail)
- Try reading approved questions as anonymous user ✅
- Try reading pending questions as anonymous user ❌ (should return empty)

### Phase 5: Client-Side Realtime (1-2 hours)

**Goal**: Replace polling with Supabase Realtime subscriptions

#### Example: Real-time Question List

**Before (Polling with useEffect)**:

```typescript
// src/components/participant/QuestionList.tsx
useEffect(() => {
  const fetchQuestions = async () => {
    const res = await fetch(`/api/sessions/${code}/questions`);
    const data = await res.json();
    setQuestions(data);
  };

  fetchQuestions();
  const interval = setInterval(fetchQuestions, 10000); // Poll every 10s

  return () => clearInterval(interval);
}, [code]);
```

**After (Realtime Subscription)**:

```typescript
"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

export function QuestionList({ sessionId }: { sessionId: string }) {
  const [questions, setQuestions] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    // Initial fetch
    const fetchQuestions = async () => {
      const { data } = await supabase
        .from("questions")
        .select("*")
        .eq("session_id", sessionId)
        .in("status", ["approved", "answered", "being_answered"])
        .order("vote_count", { ascending: false });

      if (data) setQuestions(data);
    };

    fetchQuestions();

    // Subscribe to changes
    const channel = supabase
      .channel("questions_changes")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen to INSERT, UPDATE, DELETE
          schema: "public",
          table: "questions",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          console.log("Change received!", payload);

          if (payload.eventType === "INSERT") {
            setQuestions((prev) => [...prev, payload.new]);
          } else if (payload.eventType === "UPDATE") {
            setQuestions((prev) =>
              prev.map((q) => (q.id === payload.new.id ? payload.new : q)),
            );
          } else if (payload.eventType === "DELETE") {
            setQuestions((prev) => prev.filter((q) => q.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  // Render questions...
}
```

**Learning Note**:

- `postgres_changes` = listen to database events
- `filter` = only get events matching condition (like WHERE clause)
- `payload.new` = new row data after INSERT/UPDATE
- `payload.old` = old row data before UPDATE/DELETE
- Subscription is lightweight (WebSocket connection)

**Apply to All Real-time Components**:

1. `src/components/participant/QuestionList.tsx` - Live question updates
2. `src/components/host/HostQuestionList.tsx` - Host dashboard updates
3. Vote counts (update on vote INSERT/DELETE)
4. Session status (update on session UPDATE)

### Phase 6: Testing & Cleanup (1 hour)

**Test Checklist**:

- [ ] Google OAuth login works
- [ ] Sign out works
- [ ] Protected routes redirect if not authenticated
- [ ] Session creation works (creates in `qa_sessions` table)
- [ ] Session retrieval works by code
- [ ] Anonymous question submission works
- [ ] Questions appear in real-time (no page refresh)
- [ ] Voting works and updates vote count in real-time
- [ ] Host can see all questions (including pending)
- [ ] Host can update question status (approved, dismissed, answered)
- [ ] Status changes appear in real-time for participants
- [ ] Pulse check feedback works
- [ ] RLS blocks unauthorized access (try reading another user's session)
- [ ] All 157 integration tests pass (or updated)

**Cleanup**:

1. **Remove NextAuth Code**:

   ```bash
   rm src/lib/auth.ts
   rm -r src/app/api/auth
   rm src/types/next-auth.d.ts
   ```

2. **Remove NextAuth Dependencies**:

   ```bash
   npm uninstall next-auth @auth/prisma-adapter
   ```

3. **Remove NextAuth Environment Variables** from `.env.local`:

   ```
   # Remove:
   NEXTAUTH_URL
   NEXTAUTH_SECRET
   GOOGLE_CLIENT_ID  # (if not reused)
   GOOGLE_CLIENT_SECRET  # (if not reused)
   ```

4. **Optional: Remove Prisma** (if not using for other purposes):

   ```bash
   npm uninstall prisma @prisma/client
   rm -r prisma/
   ```

5. **Update Tests**: Refactor integration tests to use Supabase client instead of Prisma

## Data Migration (If Needed)

**Current Users Migration**:

If you have existing users in the `users` table from NextAuth:

```sql
-- Supabase Auth stores users in `auth.users` (managed by Supabase)
-- Your app's `public.users` table will reference `auth.users.id`

-- Option 1: Users re-authenticate (simplest)
-- Just delete old NextAuth users, they'll create new accounts via Supabase Auth

-- Option 2: Migrate users to Supabase Auth (complex, usually not worth it)
-- Requires manual user creation via Supabase Admin API
-- Not recommended unless you have many users
```

**Recommendation**: Have users re-authenticate. For an MVP with few users, this is simplest.

## Rollback Plan

If critical issues arise:

### Quick Rollback to Old Stack

1. **Restore Code**:

   ```bash
   git checkout main  # Or previous working commit
   ```

2. **Restore Dependencies**:

   ```bash
   npm install
   ```

3. **Restore Environment Variables**: Use old `.env.local`

4. **Deploy**: Push to Vercel with old code

### Gradual Rollback

- Keep both stacks temporarily (feature flag)
- Route some users to new stack, some to old
- Monitor for issues before full cutover

## Post-Migration Improvements

Once migration is stable, consider:

1. **Optimize Realtime Subscriptions**:
   - Use presence tracking for "who's viewing"
   - Broadcast cursor positions for collaborative features

2. **Leverage Supabase Storage**:
   - If you add file uploads (e.g., profile pictures)

3. **Use Supabase Functions**:
   - Server-side logic that doesn't need Next.js
   - Can be deployed as edge functions

4. **Add Supabase Auth Providers**:
   - Email/password
   - Magic links
   - Other OAuth providers (GitHub, Microsoft)

## Timeline Estimate

- **Phase 0 (Preparation)**: 1 hour
- **Phase 1 (Client Setup)**: 1 hour
- **Phase 2 (Authentication)**: 2 hours
- **Phase 3 (Database Queries)**: 3-4 hours
- **Phase 4 (RLS Policies)**: 1-2 hours
- **Phase 5 (Realtime)**: 1-2 hours
- **Phase 6 (Testing & Cleanup)**: 1 hour

**Total Estimated Time**: 10-13 hours

## Success Criteria

1. ✅ Users can sign in with Google via Supabase Auth
2. ✅ All API routes use Supabase client instead of Prisma
3. ✅ RLS policies enforce security (hosts can only access their sessions)
4. ✅ Real-time updates work (questions, votes appear instantly)
5. ✅ No polling (setInterval removed from all components)
6. ✅ All tests pass or updated
7. ✅ No Prisma dependencies in package.json (optional)
8. ✅ No NextAuth code remaining

## Learning Resources

- [Supabase + Next.js Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Supabase Auth with Server Components](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Realtime Guide](https://supabase.com/docs/guides/realtime)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase + Next.js Example App](https://github.com/vercel/next.js/tree/canary/examples/with-supabase)

## Questions to Address Before Starting

1. **Do you have users in production?**
   - If yes: Consider data migration
   - If no: Clean slate migration

2. **Are you deploying to Vercel?**
   - Yes: Supabase environment variables need to be set in Vercel dashboard
   - No: Update deployment platform config

3. **Do you need to preserve test data?**
   - If yes: Export from Supabase before starting
   - If no: Can reset database

4. **Timeline constraint?**
   - Block out 10-13 hours over 2-3 days
   - Can pause between phases if needed

## Next Steps

1. **Review this plan** - discuss any concerns
2. **Backup production database** (if applicable)
3. **Create migration branch**: `git checkout -b feature/supabase-migration`
4. **Begin Phase 0** - Set up Supabase Auth
5. **I'll explain each step** as we go, teaching Supabase patterns

Ready to begin? Let's start with Phase 0 (Supabase Auth setup) when you're ready!
