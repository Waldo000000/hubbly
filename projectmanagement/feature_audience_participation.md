# Feature: Audience Participation

## User Story 1: Update database schema for audience participation

**Goal:** Add pulse check feedback model and update question status enum to support audience participation features

**Status:** Completed

**Completed Tasks:**

1. ✅ Updated QuestionStatus enum to include: being_answered, answered_live, answered_via_docs (in addition to existing pending, approved, dismissed, answered)
2. ✅ Created PulseCheckFeedback model with fields: id, questionId, feedback (enum: helpful/neutral/not_helpful), participantIp, createdAt
3. ✅ Added unique constraint on [questionId, participantIp] to prevent duplicate pulse check submissions
4. ✅ Created and ran database migration (20251230011847_add_pulse_check_and_question_status)
5. ✅ Generated Prisma client for both production and test schemas

**Implementation Details:**

- Updated both `prisma/schema.prisma` and `prisma/schema.test.prisma` with identical changes
- Created new `PulseCheckFeedbackType` enum with values: helpful, neutral, not_helpful
- Added `pulseCheckFeedback` relation to Question model
- Database migration successfully applied to PostgreSQL production database
- All 74 existing tests still passing

**Acceptance Criteria:**

- ✅ Run prettier over all new files to format them
- ✅ Run build to ensure no errors
- ✅ Run linter to ensure no errors
- ✅ Update CLAUDE.md with new details
- ✅ Mark the story as done in the markdown file for it.

## User Story 2: Create API types and question submission endpoint

**Goal:** Implement backend logic for audience members to submit questions to sessions

**Status:** Completed

**Completed Tasks:**

1. ✅ Migrated database schema from IP-based to participantId-based identification
   - Renamed `voterIp` → `participantId` in Vote model
   - Renamed `participantIp` → `participantId` in PulseCheckFeedback model
   - Added optional `participantId` field to Question model
   - Created migration: `20251230114206_migrate_ip_to_participant_id`
2. ✅ Created `src/lib/participant-id.ts` utility for client-side UUID management
3. ✅ Created `src/types/participant.ts` with participant identity types
4. ✅ Defined comprehensive TypeScript types in `src/types/question.ts`:
   - Request types: SubmitQuestionRequest, VoteRequest, PulseCheckRequest
   - Response types: QuestionResponse, SubmitQuestionResponse, etc.
   - Client state types: QuestionWithClientState, VoteState, PulseCheckState
   - Validation types and constants
5. ✅ Created POST /api/sessions/[code]/questions endpoint for question submission
6. ✅ Added validation for question content (3-500 characters, authorName max 100 chars)
   - Implemented in `src/lib/question-utils.ts`
7. ✅ Verified session exists, is active, and accepting questions before allowing submission
8. ✅ Created questions with pending status by default
9. ✅ Implemented dual-layer rate limiting:
   - Primary: participantId validation and deduplication (UX)
   - Secondary: IP-based rate limiting (security - 5 questions per 5 minutes per IP)
   - Rate limiting utilities in `src/lib/rate-limit.ts`
   - IP extraction utilities in `src/lib/request-utils.ts`
10. ✅ Return appropriate error messages for validation failures and rate limiting
11. ✅ Created comprehensive integration tests in `__tests__/integration/question-submission.test.ts`
    - 16 tests covering validation, session checks, participant tracking, etc.
12. ✅ Updated CLAUDE.md with:
    - Participant identity model documentation
    - New file references and organization
    - Question management section

**Implementation Notes:**

- **Participant Identity**: Using client-generated UUIDs instead of IP addresses
  - Solves corporate proxy/NAT issues (multiple people behind same IP)
  - Better UX: participants can reliably see their own submissions
  - Stored in localStorage as `participant_{sessionCode}`
- **Rate Limiting**: Dual-layer approach (participantId for UX + IP for security)
  - In-memory rate limiting with automatic cleanup
  - Standard rate limit headers in API responses
- **Testing**: All 90 tests passing, build succeeds

**Acceptance Criteria:**

- ✅ Run prettier over all new files to format them
- ✅ Run build to ensure no errors
- ✅ Run linter to ensure no errors
- ✅ Update CLAUDE.md with new details
- ✅ Mark the story as done in the markdown file for it.

## User Story 3: Create question retrieval and voting endpoints

**Goal:** Implement backend logic for viewing approved questions and voting on them

**Status:** Completed

**Completed Tasks:**

1. ✅ Created GET /api/sessions/[code]/questions endpoint that returns only approved questions
2. ✅ Sort questions by vote count (descending) and creation date
3. ✅ Include vote count, question status, and participantId in response
4. ✅ Created POST /api/questions/[id]/vote endpoint for upvoting questions
5. ✅ Check for duplicate votes using participantId (unique constraint on questionId + participantId)
6. ✅ Increment vote count on question when vote is added
7. ✅ Created DELETE /api/questions/[id]/vote endpoint for removing votes
8. ✅ Decrement vote count on question when vote is removed
9. ✅ Implemented dual-layer rate limiting for votes:
   - Primary: participantId-based deduplication (UX)
   - Secondary: IP-based rate limiting (security - 30 votes per minute per IP)
10. ✅ Added 6 new integration tests covering:
    - Question retrieval (approved only, sorted by votes)
    - Vote creation and increment logic
    - Duplicate vote prevention
    - Vote deletion and decrement logic
    - Multi-participant voting

**Implementation Details:**

- **GET /api/sessions/[code]/questions**: Retrieves approved questions only, sorted by voteCount DESC, createdAt DESC
- **POST /api/questions/[id]/vote**: Creates vote in transaction with vote count increment
- **DELETE /api/questions/[id]/vote**: Deletes vote in transaction with vote count decrement
- **Error Handling**: Returns appropriate errors for:
  - Invalid participantId format
  - Question not found
  - Already voted (409 Conflict)
  - Vote not found (404 for DELETE)
  - Rate limit exceeded (429)
- **Testing**: All 96 tests passing, build succeeds

**Acceptance Criteria:**

- ✅ Run prettier over all new files to format them
- ✅ Run build to ensure no errors
- ✅ Run linter to ensure no errors
- ✅ Update CLAUDE.md with new details
- ✅ Mark the story as done in the markdown file for it.

## User Story 4: Create pulse check feedback endpoint

**Goal:** Implement backend logic for audience members to provide emoji feedback on answered questions

**Status:** Completed

**Completed Tasks:**

1. ✅ Created POST /api/questions/[id]/pulse endpoint for submitting pulse check feedback
2. ✅ Validated feedback value is one of: helpful, neutral, not_helpful
3. ✅ Check question exists and has status of answered, answered_live, or answered_via_docs
4. ✅ Check for duplicate feedback using participantId (unique constraint on questionId + participantId)
5. ✅ Store feedback in PulseCheckFeedback table
6. ✅ Implemented dual-layer rate limiting:
   - Primary: participantId-based deduplication (UX)
   - Secondary: IP-based rate limiting (security - 20 pulse checks per minute per IP)
7. ✅ Return appropriate error messages for validation failures
8. ✅ Added 5 new integration tests covering:
   - Pulse check submission for answered questions
   - All valid feedback types (helpful, neutral, not_helpful)
   - Duplicate feedback prevention
   - Question status validation (only answered statuses allowed)
   - Multi-participant feedback tracking

**Implementation Details:**

- **POST /api/questions/[id]/pulse**: Submits emoji feedback on answered questions
- **Feedback Types**: helpful (💚), neutral (💛), not_helpful (🔴)
- **Question Status Validation**: Only allows feedback for questions with status:
  - answered
  - answered_live
  - answered_via_docs
- **Error Handling**: Returns appropriate errors for:
  - Invalid participantId format (400)
  - Invalid feedback type (400)
  - Question not found (404)
  - Question not answered (400)
  - Already submitted feedback (409 Conflict)
  - Rate limit exceeded (429)
- **Testing**: All 101 tests passing, build succeeds

**Acceptance Criteria:**

- ✅ Run prettier over all new files to format them
- ✅ Run build to ensure no errors
- ✅ Run linter to ensure no errors
- ✅ Update CLAUDE.md with new details
- ✅ Mark the story as done in the markdown file for it.

## User Story 5: Add comprehensive tests for audience participation APIs

**Goal:** Test all audience participation backend logic to ensure correctness and reliability

**Status:** Completed

**Completed Tasks:**

1. ✅ Reviewed existing test coverage (101 tests) against testing strategy
2. ✅ Identified gaps: rate limiting and request utilities lacked direct unit tests
3. ✅ Created `__tests__/utils/rate-limit.test.ts` with 13 tests covering:
   - Rate limit enforcement (allow/deny logic)
   - Multiple requests tracking within window
   - Rate limit isolation by action and identifier
   - Time window expiration and reset
   - Retry-after calculation
   - Rate limit headers generation (X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After)
   - RATE_LIMITS configuration validation
4. ✅ Created `__tests__/utils/request-utils.test.ts` with 12 tests covering:
   - IP extraction from all proxy header types (x-forwarded-for, x-real-ip, x-vercel-forwarded-for, cf-connecting-ip)
   - Header priority order validation
   - IPv6 address support
   - Edge cases (whitespace trimming, single IPs, comma-separated lists, missing headers)
5. ✅ Fixed NextRequest error by adding `@jest-environment node` to test files
6. ✅ All 126 tests passing (integration + utility tests)

**Implementation Notes:**

- **Rate Limit Tests**: Focus on business logic correctness, not storage implementation details
- **Request Utils Tests**: Validate IP extraction from all proxy header types used in production (Vercel, Cloudflare, standard)
- **Coverage**: All critical utility functions now have direct unit tests per testing strategy
- **Test Database**: SQLite in-memory for isolation
- **Total Test Count**: 126 tests (up from 101)

**Acceptance Criteria:**

- ✅ Run prettier over all new files to format them
- ✅ Run build to ensure no errors
- ✅ Run linter to ensure no errors
- ✅ Update CLAUDE.md with new details
- ✅ Mark the story as done in the markdown file for it.

## User Story 6: Create participant session view and name entry

**Goal:** Build the main participant page where audience members join and view sessions

**Status:** Not Started

**Tasks:**

1. Create src/app/session/[code]/page.tsx as a public page (no authentication required)
2. Fetch and validate session by code on page load
3. Display session information (title, description, status)
4. Create name entry flow: prompt for name or "Join Anonymously" option
5. Store participant name choice in localStorage for session persistence
6. Handle error cases: invalid code, expired session, inactive session
7. Add mobile-optimized layout with large touch targets
8. Display appropriate messages when session is not accepting questions
9. Add loading states during session fetch

**Acceptance Criteria:**

- Run prettier over all new files to format them
- Run build to ensure no errors
- Run linter to ensure no errors
- Update CLAUDE.md with new details
- Mark the story as done in the markdown file for it.

## User Story 7: Create question submission UI

**Goal:** Build the question submission form for audience members to ask questions

**Status:** Not Started

**Tasks:**

1. Create src/components/participant/QuestionSubmitForm.tsx component
2. Add textarea input with character counter (max 500 characters)
3. Add toggle or checkbox for "Submit anonymously" vs using entered name
4. Add submit button with loading state during submission
5. Display success message after successful submission
6. Display error messages for validation failures and rate limiting
7. Clear form after successful submission
8. Disable form when session is not accepting questions
9. Add mobile-optimized styling with large buttons and inputs

**Acceptance Criteria:**

- Run prettier over all new files to format them
- Run build to ensure no errors
- Run linter to ensure no errors
- Update CLAUDE.md with new details
- Mark the story as done in the markdown file for it.

## User Story 8: Create question list and voting UI

**Goal:** Build the question display and voting interface for participants to view and upvote questions

**Status:** Not Started

**Tasks:**

1. Create src/components/participant/QuestionList.tsx component
2. Display approved questions sorted by vote count (highest first)
3. Create src/components/participant/QuestionCard.tsx component for individual questions
4. Show question content, author name (or "Anonymous"), vote count, and status badge
5. Create vote button component with upvote icon
6. Add visual feedback when voting (color change, animation)
7. Prevent duplicate votes by checking with API and tracking locally
8. Display question status badges: "Being answered", "Answered Live", "Answered via Docs"
9. Add auto-refresh/polling to show new questions and vote updates
10. Mobile-optimized layout with large tap targets for vote buttons

**Acceptance Criteria:**

- Run prettier over all new files to format them
- Run build to ensure no errors
- Run linter to ensure no errors
- Update CLAUDE.md with new details
- Mark the story as done in the markdown file for it.

## User Story 9: Create pulse check feedback UI

**Goal:** Build the emoji feedback interface for participants to rate how helpful answers were

**Status:** Not Started

**Tasks:**

1. Create src/components/participant/PulseCheck.tsx component
2. Display "Did this answer help?" prompt above emoji buttons
3. Add three emoji buttons: 💚 (helpful), 💛 (neutral), 🔴 (not helpful)
4. Show pulse check only for questions with answered status (answered, answered_live, answered_via_docs)
5. Add visual feedback when feedback is submitted (disabled state, checkmark)
6. Prevent duplicate submissions by checking with API and tracking locally in localStorage
7. Display error messages if submission fails
8. Mobile-optimized with large tap targets (min 44px)
9. Add smooth transitions and animations for better UX

**Acceptance Criteria:**

- Run prettier over all new files to format them
- Run build to ensure no errors
- Run linter to ensure no errors
- Update CLAUDE.md with new details
- Mark the story as done in the markdown file for it.
