# Feature: Question Management

## User Story 0: Simplify Question Status Model

**Goal:** Remove unnecessary answer status distinctions (answered_live, answered_via_docs) and use a single "answered" status for MVP simplicity

**Status:** Completed

**Tasks:**

1. Update `prisma/schema.prisma`
   - Remove `answered_live` and `answered_via_docs` from `QuestionStatus` enum
   - Keep only: `pending`, `approved`, `dismissed`, `answered`, `being_answered`
   - Create and run migration to update database schema
2. Update `src/types/question.ts`
   - Remove references to `answered_live` and `answered_via_docs` from type definitions
   - Update `QUESTION_STATUS_LABELS` to remove those statuses
   - Ensure all types reference the simplified enum
3. Update product specification
   - Edit `projectmanagement/PRODUCT_SPEC.md` line 49: Change from "Being answered," "Answered Live," or "Answered via Docs" to just "Being answered" or "Answered"
   - Edit `projectmanagement/PRODUCT_SPEC.md` line 105: Change from "Answered Live" or "Answered via Docs" to just "Answered"
   - Update any other references to these statuses in the product spec
4. Update technical specification
   - Edit `projectmanagement/TECHNICAL_SPEC.md` to reflect simplified status enum
   - Update any documentation about question statuses
5. Update `CLAUDE.md`
   - Update the "Database Schema" section to reflect simplified question status values
   - Remove references to `answered_live` and `answered_via_docs`
6. Search codebase for any existing references
   - Use Grep to find any references to `answered_live` or `answered_via_docs` in the codebase
   - Update or remove those references
   - Check test files for references to these statuses
7. Update tests
   - Review all test files for references to removed statuses
   - Update test expectations to use `answered` status instead

**Acceptance Criteria:**

- Run prettier over all new files to format them
- Run build to ensure no errors
- Run linter to ensure no errors
- Update CLAUDE.md with new details
- Mark the story as done in the markdown file for it.

**Verification with Playwright:**

- Not applicable (database/documentation cleanup story)
- Verify migration runs successfully
- Verify all tests pass after changes
- Run `npm run build:local` to ensure TypeScript compilation succeeds

## User Story 1: Host Views Questions Sorted by Votes

**Goal:** Host can view all submitted questions for their session sorted by vote count to understand audience priorities

**Status:** Completed

**Tasks:**

1. Create GET `/api/sessions/[code]/host/questions` API endpoint
   - Add authentication middleware to verify requesting user owns the session
   - Query database for all questions in the session (all statuses: pending, approved, answered, being_answered, dismissed, etc.)
   - Include vote count for each question
   - Sort questions by vote count descending (highest votes first)
   - Return questions with full details (content, author, status, timestamps, vote count)
2. Create TypeScript type definitions in `src/types/question.ts`
   - Add `GetHostQuestionsResponse` interface for API response
   - Add `HostQuestionResponse` interface extending `QuestionResponse` if needed
3. Create `src/components/host/HostQuestionList.tsx` component
   - Accept questions array as prop
   - Display each question in a card with: content, author name (or "Anonymous"), vote count, status badge, timestamp
   - Show empty state when no questions exist yet
   - Sort display by vote count (highest first)
   - Style with clear visual hierarchy showing vote counts prominently
4. Integrate HostQuestionList component into host dashboard page (`src/app/session/[code]/host/page.tsx`)
   - Fetch questions from new API endpoint on component mount
   - Add loading state while fetching
   - Add error handling for fetch failures
   - Add auto-refresh (poll every 3 seconds) to show new questions in real-time
5. Write integration test in `__tests__/integration/host-questions.test.ts`
   - Test API endpoint returns questions sorted by votes
   - Test authentication requirement (only session owner can access)
   - Test unauthorized access is rejected

**Acceptance Criteria:**

- Run prettier over all new files to format them
- Run build to ensure no errors
- Run linter to ensure no errors
- Update CLAUDE.md with new details
- Mark the story as done in the markdown file for it.

**Verification with Playwright:**

- Login as authenticated host user
- Create a session via POST /api/sessions
- Submit 3+ questions with different vote counts
- Navigate to `/session/[CODE]/host` dashboard
- Take screenshot to verify questions are displayed
- Verify questions are sorted by vote count (highest first)
- Verify each question shows: content, author, vote count, status badge

## User Story 2: Host Marks Questions with Answer Status

**Goal:** Host can mark questions with different answer statuses (being_answered, answered) to communicate progress to participants

**Status:** Completed

**Tasks:**

1. Create PATCH `/api/questions/[id]` API endpoint
   - Add authentication middleware to verify requesting user owns the session that contains the question
   - Validate request body contains valid status value (being_answered, answered)
   - Query question by ID and verify it exists
   - Verify the question's session belongs to the authenticated user
   - Update question status in database
   - Return updated question with new status
2. Create TypeScript type definitions in `src/types/question.ts`
   - Add `UpdateQuestionStatusRequest` interface for request body
   - Add `UpdateQuestionStatusResponse` interface for API response
3. Add action controls to `src/components/host/HostQuestionList.tsx`
   - Add dropdown menu or button group on each question card with options: "Mark Being Answered", "Mark Answered"
   - Add loading state for individual question while status is updating
   - Handle status update API call with error handling
   - Update question status in local state optimistically (before API response)
   - Show visual feedback when status changes (color change, animation, or toast notification)
   - Display current status with clear badge styling (e.g., green for answered, blue for being_answered)
4. Update question card styling to show status
   - Add color-coded status badges
   - Make answered questions visually distinct (e.g., lighter background, checkmark icon)
   - Questions with being_answered status should have distinct styling (e.g., blue badge, emphasized)
5. Write integration test in `__tests__/integration/host-question-status.test.ts`
   - Test API endpoint updates question status
   - Test authentication requirement (only session owner can update)
   - Test validation of status values
   - Test invalid question ID returns 404
   - Test only valid statuses are accepted (being_answered, answered)

**Acceptance Criteria:**

- Run prettier over all new files to format them
- Run build to ensure no errors
- Run linter to ensure no errors
- Update CLAUDE.md with new details
- Mark the story as done in the markdown file for it.

**Verification with Playwright:**

- Login as authenticated host user
- Create session and submit test questions
- Navigate to host dashboard
- Click "Mark as Answered" button on a question
- Take screenshot to verify question status changed to "Answered"
- Verify status badge color/text updated
- Click "Mark Being Answered" on another question
- Verify status changes to "Being Answered"
- Refresh page and verify status persists

## User Story 3: Participants Leave Pulse Check Feedback on Answered Questions

**Goal:** Participants can provide emoji feedback (💚/💛/🔴) on answered questions, and pulse check stats are visible to both hosts and participants

**Status:** Not Started

**Tasks:**

1. Update `src/app/api/sessions/[code]/questions/route.ts` GET endpoint
   - For each question with answered status, include pulse check aggregated stats
   - Calculate counts for each feedback type (helpful, neutral, not_helpful)
   - Return stats as part of question response: `pulseCheckStats: { helpful: number, neutral: number, not_helpful: number }`
2. Update `src/app/api/sessions/[code]/host/questions/route.ts` GET endpoint
   - Include same pulse check aggregated stats for answered questions
   - Return stats as part of host question response
3. Update TypeScript type definitions in `src/types/question.ts`
   - Add `PulseCheckStats` interface with helpful, neutral, not_helpful counts
   - Update `QuestionResponse` to include optional `pulseCheckStats?: PulseCheckStats`
   - Update `HostQuestionResponse` to include `pulseCheckStats?: PulseCheckStats`
4. Update `src/components/participant/QuestionCard.tsx` component
   - Add conditional rendering: show PulseCheck component only for answered questions (status is answered)
   - Display pulse check stats below or next to the question: show counts for each emoji (💚 5, 💛 2, 🔴 1)
   - Use existing `PulseCheck` component for submitting feedback
   - Show stats even if participant hasn't submitted feedback yet
5. Update `src/components/host/HostQuestionList.tsx` component
   - Display pulse check stats on answered question cards
   - Show emoji counts in a compact format (💚 5, 💛 2, 🔴 1)
   - Style to make stats visible but not overwhelming
   - Show "No feedback yet" message if answered question has no pulse check responses
6. Write integration test in `__tests__/integration/pulse-check-feedback.test.ts`
   - Test participant can submit pulse check on answered question
   - Test participant cannot submit duplicate feedback (one per question per participant)
   - Test pulse check stats are aggregated correctly
   - Test stats appear in both host and participant question lists
   - Test pulse check is only available for answered questions (not pending/approved)

**Acceptance Criteria:**

- Run prettier over all new files to format them
- Run build to ensure no errors
- Run linter to ensure no errors
- Update CLAUDE.md with new details
- Mark the story as done in the markdown file for it.

**Verification with Playwright:**

- Navigate to participant view of active session (`/session/[CODE]`)
- Host marks a question as "Answered" via API or UI
- Refresh participant view
- Verify PulseCheck emoji buttons appear below/on the answered question
- Click 💚 (helpful) emoji
- Take screenshot to verify feedback submitted and count shows "💚 1"
- Verify cannot submit duplicate feedback (button disabled or hidden)
- Open host dashboard in new tab
- Verify pulse check stats are visible on the answered question card showing "💚 1"
- Submit feedback from another participant (different participantId)
- Verify both host and participant views update to show "💚 2"

## User Story 4: Participants See Highlighted "Being Answered" Question

**Goal:** When host marks a question as "being_answered", participants see it highlighted in their question list so they know what's currently being addressed

**Status:** Not Started

**Tasks:**

1. Update `src/components/participant/QuestionList.tsx` component
   - Check if any question has status "being_answered"
   - If found, apply special highlight styling to that question card
   - Move "being_answered" question to the top of the list (above other questions regardless of vote count)
   - Add visual indicator: border, background color, icon, or "Currently Being Answered" badge
2. Update `src/components/participant/QuestionCard.tsx` component
   - Accept `isBeingAnswered` prop to apply highlight styles
   - Add prominent visual styling: blue border, light blue background, or pulsing animation
   - Add "Currently Being Answered" badge or label at the top of the card
   - Make it stand out clearly from other questions
3. Add auto-scroll behavior in `src/components/participant/QuestionList.tsx`
   - When a question transitions to "being_answered" status, automatically scroll it into view
   - Use smooth scroll animation for better UX
   - Only scroll if the question is not already visible on screen
4. Write integration test in `__tests__/integration/being-answered-highlight.test.ts`
   - Test that question with being_answered status is identified correctly
   - Test participant view shows highlighted question
   - Test only one question can be "being_answered" at a time (optional business logic)
5. Update existing auto-refresh logic in participant view
   - Ensure questions re-render when status changes
   - Verify highlight appears/disappears in real-time when host updates status

**Acceptance Criteria:**

- Run prettier over all new files to format them
- Run build to ensure no errors
- Run linter to ensure no errors
- Update CLAUDE.md with new details
- Mark the story as done in the markdown file for it.

**Verification with Playwright:**

- Navigate to participant view of active session (`/session/[CODE]`)
- Submit 3+ questions as participant
- Open host dashboard in new tab
- Mark one question as "Being Answered"
- Switch back to participant view tab
- Wait for auto-refresh (3 seconds)
- Take screenshot to verify the "being_answered" question is highlighted with distinct styling
- Verify it appears at the top of the list
- Verify "Currently Being Answered" badge or label is visible
- Mark question as "Answered" from host view
- Switch to participant view
- Verify highlight is removed after auto-refresh
- Verify question returns to normal position in vote-sorted list
