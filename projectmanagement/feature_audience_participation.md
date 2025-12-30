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

**Status:** Not Started

**Tasks:**

1. Define TypeScript types in src/types/question.ts for Question, QuestionSubmission, QuestionWithVotes, Vote, and PulseCheck entities
2. Create POST /api/sessions/[code]/questions endpoint for question submission
3. Add validation for question content (not empty, character limit of 500 characters)
4. Check session exists, is active, and is accepting questions before allowing submission
5. Create question with pending status by default
6. Add IP-based rate limiting (5 questions per 5 minutes per IP)
7. Return appropriate error messages for validation failures and rate limiting

**Acceptance Criteria:**

- Run prettier over all new files to format them
- Run build to ensure no errors
- Run linter to ensure no errors
- Update CLAUDE.md with new details
- Mark the story as done in the markdown file for it.

## User Story 3: Create question retrieval and voting endpoints

**Goal:** Implement backend logic for viewing approved questions and voting on them

**Status:** Not Started

**Tasks:**

1. Create GET /api/sessions/[code]/questions endpoint that returns only approved questions
2. Sort questions by vote count (descending) and creation date
3. Include vote count and question status in response
4. Create POST /api/questions/[id]/vote endpoint for upvoting questions
5. Check for duplicate votes using IP address (unique constraint on questionId + voterIp)
6. Increment vote count on question when vote is added
7. Create DELETE /api/questions/[id]/vote endpoint for removing votes
8. Decrement vote count on question when vote is removed
9. Add IP-based rate limiting for votes (30 votes per minute per IP)

**Acceptance Criteria:**

- Run prettier over all new files to format them
- Run build to ensure no errors
- Run linter to ensure no errors
- Update CLAUDE.md with new details
- Mark the story as done in the markdown file for it.

## User Story 4: Create pulse check feedback endpoint

**Goal:** Implement backend logic for audience members to provide emoji feedback on answered questions

**Status:** Not Started

**Tasks:**

1. Create POST /api/questions/[id]/pulse endpoint for submitting pulse check feedback
2. Validate feedback value is one of: helpful, neutral, not_helpful
3. Check question exists and has status of answered, answered_live, or answered_via_docs
4. Check for duplicate feedback using IP address (unique constraint on questionId + participantIp)
5. Store feedback in PulseCheckFeedback table
6. Add IP-based rate limiting (20 pulse checks per minute per IP)
7. Return appropriate error messages for validation failures

**Acceptance Criteria:**

- Run prettier over all new files to format them
- Run build to ensure no errors
- Run linter to ensure no errors
- Update CLAUDE.md with new details
- Mark the story as done in the markdown file for it.

## User Story 5: Add comprehensive tests for audience participation APIs

**Goal:** Test all audience participation backend logic to ensure correctness and reliability

**Status:** Not Started

**Tasks:**

1. Create integration tests in __tests__/integration/audience-participation.test.ts
2. Test question submission workflow with valid data, empty content, too long content
3. Test question submission when session is inactive or not accepting questions
4. Test question retrieval returns only approved questions sorted by votes
5. Test voting workflow including duplicate vote prevention
6. Test vote removal workflow
7. Test pulse check submission with valid and invalid feedback values
8. Test pulse check duplicate prevention
9. Test rate limiting for all endpoints
10. Test error scenarios and edge cases

**Acceptance Criteria:**

- Run prettier over all new files to format them
- Run build to ensure no errors
- Run linter to ensure no errors
- Update CLAUDE.md with new details
- Mark the story as done in the markdown file for it.

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
