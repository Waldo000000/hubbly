# Supabase Row Level Security (RLS) Implementation Plan

## Executive Summary

This document outlines the plan to implement Row Level Security (RLS) on all Supabase database tables to secure the Hubbly Q&A application. Currently, RLS is disabled, which poses a security risk as anyone with the database URL could read or modify data.

**Learning Note**: During implementation, I will explain each step in detail so you can understand:

- What RLS is and how it works
- Why each policy is structured the way it is
- How Postgres evaluates RLS policies
- Common patterns and best practices
- How to debug RLS issues
- Trade-offs and design decisions

This will be a learning experience as we implement together!

## Current State

- **Status**: RLS disabled on all public tables
- **Risk Level**: HIGH - Database is publicly accessible
- **Tables Affected**: 8 tables (users, qa_sessions, questions, votes, pulse_check_feedback, accounts, sessions, verification_tokens)

## Goals

1. Enable RLS on all public tables
2. Define granular access policies for each table
3. Maintain anonymous participation functionality (client-generated participant IDs)
4. Ensure NextAuth continues to function properly
5. Protect sensitive data (user emails, OAuth tokens)
6. Allow public read access where appropriate (approved questions, session details)

## Database Schema Overview

### User-Related Tables

- `users` - User accounts (hosts)
- `accounts` - OAuth provider accounts (NextAuth)
- `sessions` - NextAuth session tokens
- `verification_tokens` - Email verification tokens (NextAuth)

### Application Tables

- `qa_sessions` - Q&A sessions created by hosts
- `questions` - Questions submitted by participants
- `votes` - Upvotes on questions (by participant ID)
- `pulse_check_feedback` - Emoji feedback on answered questions (by participant ID)

## Access Requirements Analysis

### 1. Users Table (`users`)

**Access Patterns:**

- NextAuth needs to create/read/update users during OAuth flow
- Users should be able to read their own profile
- No public access to user list
- Hosts need to verify they own sessions

**RLS Policies:**

1. **SELECT**: Users can read their own record
2. **INSERT**: Service role only (NextAuth creates users)
3. **UPDATE**: Users can update their own record
4. **DELETE**: Service role only (admin function)

**Special Considerations:**

- NextAuth operations use service role key (bypasses RLS)
- Email addresses should not be exposed publicly

### 2. QA Sessions Table (`qa_sessions`)

**Access Patterns:**

- Anyone can read active sessions by code (for joining)
- Only authenticated users can create sessions
- Only session host can update their sessions
- Only session host can delete their sessions
- Public can read session details (title, description, code) but not host email

**RLS Policies:**

1. **SELECT**: Public can read active sessions (is_active = true)
2. **INSERT**: Authenticated users only (auth.uid() IS NOT NULL)
3. **UPDATE**: Session host only (host_id = auth.uid())
4. **DELETE**: Session host only (host_id = auth.uid())

**Special Considerations:**

- Join queries will need to be careful not to expose user.email
- Session code lookup must be fast (indexed)

### 3. Questions Table (`questions`)

**Access Patterns:**

- Anyone can submit questions (anonymous participation)
- Public can read approved questions only
- Session host can read ALL questions (including pending/dismissed)
- Only session host can update question status
- Only session host can delete questions

**RLS Policies:**

1. **SELECT (Public)**: Can read approved questions for any session
   - `status = 'approved' OR status = 'answered' OR status = 'being_answered'`
2. **SELECT (Host)**: Can read ALL questions for their sessions
   - `session.host_id = auth.uid()`
3. **INSERT**: Anyone can create questions (anonymous participation)
4. **UPDATE**: Session host only (via session.host_id)
5. **DELETE**: Session host only (via session.host_id)

**Special Considerations:**

- Complex policy: public sees approved, host sees all
- Need to join to qa_sessions to check host_id
- Participant IDs are not authenticated (client-generated UUIDs)

### 4. Votes Table (`votes`)

**Access Patterns:**

- Anyone can vote (anonymous participation)
- Public can read vote counts (aggregated)
- Participants can delete their own votes (by participant_id)
- No one can directly update votes

**RLS Policies:**

1. **SELECT**: Public can read all votes (for aggregation)
2. **INSERT**: Anyone can create votes
3. **UPDATE**: No one (votes are immutable)
4. **DELETE**: Anyone can delete votes matching their participant_id
   - `participant_id = current_setting('app.participant_id', true)`

**Special Considerations:**

- Participant ID must be passed as session variable for DELETE
- Need application-level enforcement for vote uniqueness

### 5. Pulse Check Feedback Table (`pulse_check_feedback`)

**Access Patterns:**

- Anyone can submit pulse check feedback (anonymous participation)
- Public can read feedback (aggregated)
- Participants can update/delete their own feedback (by participant_id)

**RLS Policies:**

1. **SELECT**: Public can read all feedback (for aggregation)
2. **INSERT**: Anyone can create feedback
3. **UPDATE**: Anyone can update feedback matching their participant_id
4. **DELETE**: Anyone can delete feedback matching their participant_id

**Special Considerations:**

- Similar to votes, participant_id-based access control
- Need application-level enforcement for uniqueness

### 6. NextAuth Tables (`accounts`, `sessions`, `verification_tokens`)

**Access Patterns:**

- NextAuth library needs full access using service role
- Users should only see their own auth data
- No public access

**RLS Policies for `accounts`:**

1. **SELECT**: Users can read their own accounts (user_id = auth.uid())
2. **INSERT/UPDATE/DELETE**: Service role only (NextAuth manages)

**RLS Policies for `sessions`:**

1. **SELECT**: Users can read their own sessions (user_id = auth.uid())
2. **INSERT/UPDATE/DELETE**: Service role only (NextAuth manages)

**RLS Policies for `verification_tokens`:**

1. **SELECT/INSERT/UPDATE/DELETE**: Service role only (NextAuth manages)

**Special Considerations:**

- NextAuth MUST use service role key to bypass RLS
- Verify Prisma client uses correct connection string

## Implementation Strategy

### Phase 1: Preparation (Risk Mitigation)

1. **Backup Database**: Take full snapshot of production database
2. **Test Environment**: Create staging environment with RLS enabled first
3. **Service Role Setup**: Ensure NextAuth uses service role connection string
4. **Session Variables**: Implement participant_id session variable passing

### Phase 2: Create RLS Policies (Incremental Rollout)

1. **Start with NextAuth tables** (least risky, well-defined patterns)
   - Enable RLS on accounts, sessions, verification_tokens
   - Create service role bypass policies
   - Test authentication flow thoroughly
2. **Enable RLS on users table**
   - Create self-access policies
   - Test user profile access
3. **Enable RLS on qa_sessions table**
   - Create host ownership policies
   - Test session creation and host dashboard
4. **Enable RLS on questions table**
   - Create public + host policies
   - Test question submission and moderation
5. **Enable RLS on votes table**
   - Create anonymous participation policies
   - Test voting functionality
6. **Enable RLS on pulse_check_feedback table**
   - Create anonymous participation policies
   - Test feedback submission

### Phase 3: Testing & Validation

1. **Functional Testing**:
   - Anonymous question submission works
   - Anonymous voting works
   - Host can only access their own sessions
   - Host can see all questions (pending/approved)
   - Public can only see approved questions
   - NextAuth login/logout works
2. **Security Testing**:
   - Attempt to access other users' sessions
   - Attempt to read pending questions as public user
   - Attempt to modify votes with wrong participant_id
   - Verify no data leaks in joins
3. **Performance Testing**:
   - Measure query performance with RLS enabled
   - Check for slow queries caused by policy checks
   - Optimize indexes if needed

### Phase 4: Deployment

1. **Staging Deployment**: Deploy to staging, run full test suite
2. **Production Deployment**: Enable RLS on production during low-traffic period
3. **Monitoring**: Watch for authentication errors, failed queries
4. **Rollback Plan**: Document steps to disable RLS if critical issues arise

## SQL Implementation

### Enable RLS on All Tables

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_check_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
```

### RLS Policies - Users Table

```sql
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Service role can do anything (for NextAuth)
CREATE POLICY "Service role full access"
  ON users FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
```

### RLS Policies - QA Sessions Table

```sql
-- Anyone can read active sessions (for joining)
CREATE POLICY "Anyone can read active sessions"
  ON qa_sessions FOR SELECT
  USING (is_active = true);

-- Authenticated users can create sessions
CREATE POLICY "Authenticated users can create sessions"
  ON qa_sessions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = host_id);

-- Session hosts can update their sessions
CREATE POLICY "Hosts can update own sessions"
  ON qa_sessions FOR UPDATE
  USING (auth.uid() = host_id);

-- Session hosts can delete their sessions
CREATE POLICY "Hosts can delete own sessions"
  ON qa_sessions FOR DELETE
  USING (auth.uid() = host_id);
```

### RLS Policies - Questions Table

```sql
-- Public can read approved questions
CREATE POLICY "Public can read approved questions"
  ON questions FOR SELECT
  USING (
    status IN ('approved', 'answered', 'being_answered')
  );

-- Hosts can read all questions for their sessions
CREATE POLICY "Hosts can read all questions for own sessions"
  ON questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM qa_sessions
      WHERE qa_sessions.id = questions.session_id
      AND qa_sessions.host_id = auth.uid()
    )
  );

-- Anyone can submit questions (anonymous participation)
CREATE POLICY "Anyone can submit questions"
  ON questions FOR INSERT
  WITH CHECK (true);

-- Hosts can update questions for their sessions
CREATE POLICY "Hosts can update questions for own sessions"
  ON questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM qa_sessions
      WHERE qa_sessions.id = questions.session_id
      AND qa_sessions.host_id = auth.uid()
    )
  );

-- Hosts can delete questions for their sessions
CREATE POLICY "Hosts can delete questions for own sessions"
  ON questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM qa_sessions
      WHERE qa_sessions.id = questions.session_id
      AND qa_sessions.host_id = auth.uid()
    )
  );
```

### RLS Policies - Votes Table

```sql
-- Public can read all votes (for aggregation)
CREATE POLICY "Public can read votes"
  ON votes FOR SELECT
  USING (true);

-- Anyone can create votes (anonymous participation)
CREATE POLICY "Anyone can vote"
  ON votes FOR INSERT
  WITH CHECK (true);

-- Users can delete their own votes (by participant_id)
CREATE POLICY "Users can delete own votes"
  ON votes FOR DELETE
  USING (
    participant_id = current_setting('app.participant_id', true)
  );
```

### RLS Policies - Pulse Check Feedback Table

```sql
-- Public can read all feedback (for aggregation)
CREATE POLICY "Public can read pulse check feedback"
  ON pulse_check_feedback FOR SELECT
  USING (true);

-- Anyone can create feedback (anonymous participation)
CREATE POLICY "Anyone can submit pulse check feedback"
  ON pulse_check_feedback FOR INSERT
  WITH CHECK (true);

-- Users can update their own feedback (by participant_id)
CREATE POLICY "Users can update own pulse check feedback"
  ON pulse_check_feedback FOR UPDATE
  USING (
    participant_id = current_setting('app.participant_id', true)
  );

-- Users can delete their own feedback (by participant_id)
CREATE POLICY "Users can delete own pulse check feedback"
  ON pulse_check_feedback FOR DELETE
  USING (
    participant_id = current_setting('app.participant_id', true)
  );
```

### RLS Policies - NextAuth Tables

```sql
-- Accounts: Users can read their own accounts
CREATE POLICY "Users can read own accounts"
  ON accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = accounts.user_id
      AND users.id = auth.uid()
    )
  );

-- Service role full access (for NextAuth operations)
CREATE POLICY "Service role full access to accounts"
  ON accounts FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Sessions: Users can read their own sessions
CREATE POLICY "Users can read own sessions"
  ON sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = sessions.user_id
      AND users.id = auth.uid()
    )
  );

-- Service role full access (for NextAuth operations)
CREATE POLICY "Service role full access to sessions"
  ON sessions FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Verification Tokens: Service role only
CREATE POLICY "Service role full access to verification_tokens"
  ON verification_tokens FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
```

## Application Code Changes Required

### 1. Participant ID Session Variable

For votes and pulse check feedback DELETE operations to work, we need to pass the participant_id as a Postgres session variable.

**Implementation in API routes:**

```typescript
// Before any vote/feedback DELETE operation
await prisma.$executeRaw`SET LOCAL app.participant_id = ${participantId}`;
```

**Files to modify:**

- `src/app/api/questions/[id]/vote/route.ts` (DELETE method)
- `src/app/api/questions/[id]/pulse/route.ts` (UPDATE/DELETE methods)

### 2. NextAuth Service Role Connection

NextAuth must use a service role connection string that bypasses RLS.

**Environment Variables:**

```bash
# Regular connection (with RLS)
DATABASE_URL="postgresql://user:pass@host:5432/db"

# Service role connection (bypasses RLS for NextAuth)
DATABASE_URL_POOLED="postgresql://user:pass@host:5432/db?pgbouncer=true"
```

**Files to verify:**

- `src/lib/auth.ts` - Ensure NextAuth Prisma adapter uses service role
- May need separate Prisma client for NextAuth operations

### 3. Query Optimization

Some queries may become slower with RLS checks. Monitor and optimize:

**Potential slow queries:**

- Questions with host check (joins to qa_sessions)
- Host dashboard queries

**Optimization strategies:**

- Ensure indexes on foreign keys (session_id, host_id)
- Use query plan analysis (EXPLAIN)
- Consider computed columns for common checks

## Rollback Plan

If critical issues arise after enabling RLS:

### Quick Rollback (Disable RLS)

```sql
-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE qa_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE votes DISABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_check_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens DISABLE ROW LEVEL SECURITY;
```

### Gradual Rollback

- Disable RLS on specific tables causing issues
- Keep RLS enabled on working tables
- Investigate and fix policies for problematic tables

## Testing Checklist

### Pre-Deployment Testing (Staging)

- [ ] NextAuth login works (Google OAuth)
- [ ] NextAuth logout works
- [ ] Session creation works (authenticated users)
- [ ] Anonymous question submission works
- [ ] Anonymous voting works
- [ ] Anonymous pulse check feedback works
- [ ] Host can see all questions (pending/approved/dismissed)
- [ ] Public can only see approved questions
- [ ] Host can update question status
- [ ] Host can toggle session settings
- [ ] Vote deletion works with correct participant_id
- [ ] Vote deletion fails with wrong participant_id
- [ ] Pulse check update/delete works with correct participant_id
- [ ] Cannot access other hosts' sessions
- [ ] Cannot read other users' emails/accounts
- [ ] All existing integration tests pass

### Post-Deployment Monitoring (Production)

- [ ] Monitor Supabase logs for RLS policy violations
- [ ] Monitor application error logs for database errors
- [ ] Monitor query performance (response times)
- [ ] Verify no user-reported issues with authentication
- [ ] Verify no user-reported issues with question submission
- [ ] Verify no user-reported issues with voting

## Timeline Estimate

- **Phase 1 (Preparation)**: 1-2 hours
  - Database backup
  - Environment setup
  - Service role configuration
- **Phase 2 (Implementation)**: 3-4 hours
  - Write and test all RLS policies
  - Modify application code for participant_id session variables
  - Update NextAuth configuration
- **Phase 3 (Testing)**: 2-3 hours
  - Run full test suite
  - Manual testing of all flows
  - Performance testing
- **Phase 4 (Deployment)**: 1 hour
  - Staging deployment
  - Production deployment
  - Post-deployment monitoring

**Total Estimated Time**: 7-10 hours

## Success Criteria

1. ✅ RLS enabled on all 8 tables
2. ✅ All RLS policies created and tested
3. ✅ NextAuth authentication works correctly
4. ✅ Anonymous participation still works (questions, votes, feedback)
5. ✅ Hosts can only access their own sessions
6. ✅ Public can only see approved questions
7. ✅ No security vulnerabilities (unauthorized data access)
8. ✅ No performance degradation (queries < 500ms)
9. ✅ All integration tests pass (157 tests)
10. ✅ Zero user-reported issues post-deployment

## Risks & Mitigations

### Risk 1: NextAuth Breaks

**Impact**: HIGH - Users cannot log in
**Mitigation**:

- Test extensively in staging
- Use service role connection for NextAuth
- Have rollback plan ready

### Risk 2: Anonymous Participation Breaks

**Impact**: HIGH - Core feature failure
**Mitigation**:

- Participant_id session variable implementation
- Thorough testing of vote/feedback DELETE operations
- Keep public INSERT policies permissive

### Risk 3: Performance Degradation

**Impact**: MEDIUM - Slower queries
**Mitigation**:

- Profile queries before/after RLS
- Add indexes if needed
- Use EXPLAIN ANALYZE to identify bottlenecks

### Risk 4: Policy Logic Errors

**Impact**: HIGH - Security bypass or over-restriction
**Mitigation**:

- Peer review all policies
- Security testing with unauthorized access attempts
- Test both positive and negative cases

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [NextAuth with Supabase](https://next-auth.js.org/adapters/supabase)
- [Prisma with RLS](https://www.prisma.io/docs/guides/database/row-level-security)

## Next Steps

1. **Review this plan** with the team
2. **Create backup** of production database
3. **Set up staging environment** with RLS enabled
4. **Begin Phase 1** implementation (NextAuth tables first)
5. **Document any deviations** from this plan during implementation
