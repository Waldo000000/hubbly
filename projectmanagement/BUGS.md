# Known Bugs and Issues

This file tracks bugs and issues discovered during testing and production use.

## Active Bugs

### Bug #1: "Join Session" Button Does Nothing

**Priority:** High
**Status:** Not Fixed
**Discovered:** 2026-01-01

**Description:**
The "Join Session" button on the homepage (/) does nothing when clicked. Users cannot navigate to the session join flow.

**Expected Behavior:**
Clicking "Join Session" should either:

- Navigate to a `/join` page with a session code input form, OR
- Open a modal/dialog prompting user to enter a 6-digit session code

**Actual Behavior:**
Button click has no effect. No navigation occurs.

**Location:**

- `src/app/page.tsx` - Homepage with "Join Session" button

**Steps to Reproduce:**

1. Navigate to homepage (https://hubbly-gamma.vercel.app/)
2. Click "Join Session" button
3. Observe no action occurs

**Related Files:**

- `src/app/page.tsx`
- May need to create: `src/app/join/page.tsx` or add modal component

---

### Bug #2: Question Being Answered Not Always Shown at Top

**Priority:** High
**Status:** Not Fixed
**Discovered:** 2026-01-01

**Description:**
Questions with status `being_answered` are not consistently shown at the top of question lists. Currently, questions are sorted primarily by vote count, which means a question being actively answered might appear in the middle or bottom of the list if it has fewer votes.

**Expected Behavior:**
Questions with status `being_answered` should ALWAYS appear at the top of the question list, regardless of vote count. This applies to:

- Participant view (`/session/[code]`)
- Host view (`/session/[code]/host`)

**Actual Behavior:**
Questions are sorted by vote count only. A question marked "being_answered" with 2 votes will appear below questions with 5+ votes.

**Current Implementation:**

- `src/components/participant/QuestionList.tsx` - Sorts by votes only
- `src/components/host/HostQuestionList.tsx` - Sorts by votes only
- `src/app/api/sessions/[code]/questions/route.ts` - API returns questions sorted by votes
- `src/app/api/sessions/[code]/host/questions/route.ts` - API returns questions sorted by votes

**Proposed Fix:**
Implement multi-level sorting:

1. Primary sort: `status === 'being_answered'` (show at top)
2. Secondary sort: `voteCount DESC` (highest votes first)
3. Tertiary sort: `createdAt ASC` (oldest questions with same votes shown first)

**Related User Story:**

- `projectmanagement/feature_question_management.md` - User Story 4 (partially addresses this for participant view only)

**Related Files:**

- `src/components/participant/QuestionList.tsx`
- `src/components/host/HostQuestionList.tsx`
- `src/app/api/sessions/[code]/questions/route.ts`
- `src/app/api/sessions/[code]/host/questions/route.ts`

---

### Bug #2b: Question Being Answered Needs Better Visual Highlighting

**Priority:** Medium
**Status:** Not Fixed
**Discovered:** 2026-01-01

**Description:**
Questions with status `being_answered` do not have sufficiently clear visual highlighting. The current status badge alone is not prominent enough to draw participant attention to the question currently being addressed.

**Expected Behavior:**
Questions marked "being_answered" should have highly visible styling:

- Entire question card should have a pleasant blue background (e.g., light blue: `bg-blue-50` or `bg-blue-100`)
- Distinct border color (e.g., `border-blue-500` with thicker border)
- Optional: subtle animation (pulse or glow effect) to draw attention
- "Currently Being Answered" badge should be prominent

**Actual Behavior:**
Question cards with "being_answered" status look similar to other questions, only distinguished by a small status badge.

**Visual Design Goals:**

- Make it immediately obvious which question the host is addressing
- Ensure participants can quickly find the question being answered without scanning the entire list
- Use pleasant, non-distracting colors (soft blues, not harsh or jarring)

**Related Files:**

- `src/components/participant/QuestionCard.tsx` - Add highlight styling for `status === 'being_answered'`
- `src/components/host/HostQuestionList.tsx` - Add highlight styling for host view as well

**Related User Story:**

- `projectmanagement/feature_question_management.md` - User Story 4 (mentions highlighting but may need design enhancement)

---

### Bug #3: Newly-Added Questions Not Shown at Bottom

**Priority:** Medium
**Status:** Not Fixed
**Discovered:** 2026-01-01

**Description:**
Newly-added questions with zero votes are not consistently shown at the bottom of the list. The current sorting logic doesn't properly handle questions with identical vote counts (0 votes).

**Expected Behavior:**
Questions should be sorted with the following logic:

1. Questions with status `being_answered` at the top (regardless of votes)
2. All other approved questions sorted by:
   - Primary: `voteCount DESC` (highest votes first)
   - Secondary: `createdAt ASC` (for questions with same votes, older questions shown first)
   - Result: Newly-added questions (0 votes) appear at the bottom
3. Questions remain at bottom until voted up

**Actual Behavior:**
Questions with 0 votes may appear in inconsistent order since there's no secondary sort by timestamp.

**Current Implementation:**

- Questions are only sorted by `voteCount DESC`
- No secondary sort key (createdAt) is applied

**Proposed Fix:**
Update sorting logic to:

```typescript
questions.sort((a, b) => {
  // Primary: being_answered always at top
  if (a.status === "being_answered") return -1;
  if (b.status === "being_answered") return 1;

  // Secondary: sort by votes descending
  if (b.voteCount !== a.voteCount) {
    return b.voteCount - a.voteCount;
  }

  // Tertiary: for same votes, older questions first (newer at bottom)
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
});
```

**Related Files:**

- `src/components/participant/QuestionList.tsx`
- `src/components/host/HostQuestionList.tsx`
- `src/app/api/sessions/[code]/questions/route.ts` (if sorting done server-side)
- `src/app/api/sessions/[code]/host/questions/route.ts` (if sorting done server-side)

---

## Resolved Bugs

### Bug #2: Question Being Answered Not Always Shown at Top ✅ FIXED

**Priority:** High
**Status:** Fixed in User Story 4
**Discovered:** 2026-01-01
**Fixed:** 2026-01-01

**Description:**
Questions with status `being_answered` were not consistently shown at the top of question lists.

**Solution:**
Implemented multi-level sorting in `src/lib/question-utils.ts`:
1. Primary: `status === 'being_answered'` (always at top)
2. Secondary: `voteCount DESC` (highest votes first)
3. Tertiary: `createdAt ASC` (older questions first for same votes)

Applied sorting in:
- `src/components/participant/QuestionList.tsx`
- `src/components/host/HostQuestionList.tsx`

**Tests:**
- `__tests__/integration/being-answered-highlight.test.ts` - 7 tests covering sorting logic

---

### Bug #2b: Question Being Answered Needs Better Visual Highlighting ✅ FIXED

**Priority:** Medium
**Status:** Fixed in User Story 4
**Discovered:** 2026-01-01
**Fixed:** 2026-01-01

**Description:**
Questions with status `being_answered` did not have sufficiently clear visual highlighting.

**Solution:**
Enhanced visual styling in both participant and host views:
- Blue background (`bg-blue-50`)
- Thicker blue border (`border-blue-500`) with ring (`ring-2 ring-blue-200`)
- Prominent badge: "🎯 Currently Being Answered" (`bg-blue-600 text-white`)

Updated components:
- `src/components/participant/QuestionCard.tsx`
- `src/components/host/HostQuestionList.tsx`

---

### Bug #3: Newly-Added Questions Not Shown at Bottom ✅ FIXED

**Priority:** Medium
**Status:** Fixed in User Story 4
**Discovered:** 2026-01-01
**Fixed:** 2026-01-01

**Description:**
Newly-added questions with zero votes were not consistently shown at the bottom of the list.

**Solution:**
Added tertiary sort by `createdAt ASC` in multi-level sorting logic. Questions with same vote count are now sorted by creation time, ensuring newer questions (0 votes) appear at the bottom.

**Related Files:**
- `src/lib/question-utils.ts` - `sortQuestions()` function

---

## Testing Notes

After fixing these bugs:

1. Run `npm test` to ensure all tests pass
2. Run `npm run build:local` to verify build succeeds
3. Test manually with Playwright:
   - Create session with multiple questions
   - Mark one as "being_answered" and verify it appears at top
   - Submit new question with 0 votes and verify it appears at bottom
   - Test "Join Session" button navigation flow
4. Verify fixes in both development and production deployments
