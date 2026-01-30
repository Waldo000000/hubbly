# Optimistic Updates & SWR Migration Plan

## Overview

This plan outlines the complete migration of client-side data management to use SWR (stale-while-revalidate) with optimistic updates throughout the Hubbly Q&A application. This provides instant UI feedback for user actions while maintaining data consistency through smart background revalidation.

## Current Status

**✅ Completed:**
- `QuestionList.tsx` - Migrated to SWR with 10-second polling
- `QuestionCard.tsx` - Voting uses true optimistic updates (instant UI, no disabled state)

**🚧 Remaining Work:**
- Question submission form (pessimistic, blocks UI)
- Pulse check feedback (pessimistic, blocks UI)
- Host dashboard (manual polling, manual state)
- Participant session page (manual fetch, no revalidation)

## Benefits of This Migration

1. **Better UX** - Instant feedback, no loading spinners, no "no entry" cursors
2. **Simpler Code** - Remove manual polling loops, error handling, and state reconciliation
3. **Smart Revalidation** - Automatic refresh on tab focus, reconnect, and intervals
4. **Request Deduplication** - Multiple components can share data without extra API calls
5. **Database Agnostic** - No vendor lock-in to realtime providers like Supabase or Pusher

## Architecture Principles

### Optimistic Update Pattern

```typescript
// 1. Update UI immediately
updateLocalState(optimisticValue);

// 2. Fire API request in background
const response = await fetch('/api/endpoint', { method: 'POST' });

// 3. If fails, revert the change
if (!response.ok) {
  revertLocalState();
}

// 4. SWR revalidates on next interval (syncs with server)
```

### SWR Integration Pattern

```typescript
// Use SWR for data fetching
const { data, mutate } = useSWR('/api/endpoint', fetcher, {
  refreshInterval: 10000, // Poll every 10s
  revalidateOnFocus: true, // Refresh when tab focused
  dedupingInterval: 2000 // Ignore duplicate requests within 2s
});

// Optimistic updates via mutate
mutate(optimisticData, { revalidate: false });
```

## Migration Tasks

### Task 1: Question Submission Optimistic Updates (High Priority)

**File:** `src/components/participant/QuestionSubmitForm.tsx`

**Current Behavior:**
- Button disables during submission (`isSubmitting` state)
- User waits for API response before seeing feedback
- Form clears only after successful response

**Target Behavior:**
- Form clears immediately
- Success message shows instantly
- No disabled state (user can submit multiple questions)
- If API fails, show error and restore form content

**Implementation:**
1. Remove `isSubmitting` state
2. Clear form immediately on submit (before API call)
3. Show success message immediately
4. Fire API request in background
5. If API fails: restore form content, show error
6. Add `onQuestionSubmitted` callback to trigger SWR revalidation in parent

**Dependencies:**
- Parent `QuestionList` component needs to expose `mutate` function or provide callback

**Estimated Effort:** 1 hour

---

### Task 2: Pulse Check Optimistic Updates (High Priority)

**File:** `src/components/participant/PulseCheck.tsx`

**Current Behavior:**
- Button disables during submission (`isSubmitting` state)
- User waits for API response before seeing feedback
- State updates only after successful response

**Target Behavior:**
- Feedback selection shows immediately
- No disabled state or loading spinner
- If API fails, revert to previous state with error message

**Implementation:**
1. Remove `isSubmitting` state
2. Update `submittedFeedback` immediately on click
3. Save to localStorage immediately
4. Fire API request in background
5. If API fails: revert `submittedFeedback`, remove from localStorage, show error
6. Optional: Trigger SWR revalidation in parent QuestionList to update stats

**Estimated Effort:** 45 minutes

---

### Task 3: Host Dashboard SWR Migration (High Priority)

**File:** `src/app/session/[code]/host/page.tsx`

**Current Behavior:**
- Manual `fetchSessionData()` and `fetchQuestions()` functions
- Manual `setInterval` polling every 3 seconds
- Manual error/loading state management
- No automatic revalidation on tab focus or reconnect

**Target Behavior:**
- SWR handles all data fetching and caching
- 3-second polling via `refreshInterval`
- Automatic revalidation on tab focus
- Reduced code (~50-70 lines removed)

**Implementation Steps:**

**Step 1: Migrate session data fetch to SWR**
```typescript
const { data: sessionData, error: sessionError, isLoading } = useSWR(
  `/api/sessions/${code}`,
  fetcher,
  {
    refreshInterval: 3000,
    revalidateOnFocus: true,
  }
);
```

**Step 2: Migrate questions fetch to SWR**
```typescript
const { data: questionsData, mutate: mutateQuestions } = useSWR(
  `/api/sessions/${code}/host/questions`,
  fetcher,
  {
    refreshInterval: 3000,
    revalidateOnFocus: true,
  }
);

const questions = questionsData?.questions || [];
```

**Step 3: Update session status with optimistic updates**
```typescript
const updateSessionStatus = async (field: string, value: boolean) => {
  // Optimistic update
  mutate(
    { ...sessionData, [field]: value },
    { revalidate: false }
  );

  // API call
  const response = await fetch(`/api/sessions/${code}`, {
    method: 'PATCH',
    body: JSON.stringify({ [field]: value }),
  });

  // Revert on error
  if (!response.ok) {
    mutate(); // Force refresh from server
  }
};
```

**Step 4: Remove manual polling and state management**
- Remove `fetchSessionData()`, `fetchQuestions()` functions
- Remove `setInterval` polling useEffect
- Remove `isLoading`, `isLoadingQuestions`, `error` state variables
- Pass `mutateQuestions` to `HostQuestionList` for optimistic updates

**Files Modified:**
- `src/app/session/[code]/host/page.tsx` - Main host dashboard
- `src/components/host/HostQuestionList.tsx` - Optional: add mutate prop for instant updates

**Estimated Effort:** 2 hours

---

### Task 4: Participant Session Page SWR Migration (Medium Priority)

**File:** `src/app/session/[code]/page.tsx`

**Current Behavior:**
- Manual `fetchSession()` function
- Fetches once on mount, no revalidation
- Manual error/loading state management

**Target Behavior:**
- SWR handles session data fetching and caching
- Automatic revalidation on tab focus and reconnect
- Periodic refresh to detect session status changes (e.g., host pauses questions)

**Implementation:**
```typescript
const { data: sessionData, error: sessionError, isLoading } = useSWR(
  `/api/sessions/${code}`,
  fetcher,
  {
    refreshInterval: 10000, // Poll every 10s (detect host status changes)
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  }
);
```

**Benefits:**
- Participants see updated session status (e.g., "Questions paused" banner)
- Handles network reconnects gracefully
- Shares session data cache with QuestionList (if same key)

**Files Modified:**
- `src/app/session/[code]/page.tsx`

**Estimated Effort:** 1 hour

---

### Task 5: Create Shared SWR Fetcher Utility (Low Priority, Nice-to-Have)

**File:** `src/lib/swr-utils.ts` (new file)

**Purpose:**
- Centralize SWR fetcher function
- Add standard error handling
- Provide type-safe fetch wrapper

**Implementation:**
```typescript
export const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to fetch data');
  }

  return response.json();
};

export const swrConfig = {
  fetcher,
  revalidateOnFocus: true,
  dedupingInterval: 2000,
};
```

**Usage:**
```typescript
import { fetcher } from '@/lib/swr-utils';

const { data } = useSWR('/api/sessions/ABC123', fetcher);
```

**Files Modified:**
- `src/lib/swr-utils.ts` (new)
- All components using SWR (update imports)

**Estimated Effort:** 30 minutes

---

## Implementation Order

### Phase 1: High-Impact Quick Wins (3-4 hours)
1. ✅ Task 2: Pulse Check optimistic updates (45 min)
2. ✅ Task 1: Question submission optimistic updates (1 hour)
3. ✅ Task 3: Host dashboard SWR migration (2 hours)

### Phase 2: Consistency & Polish (1-2 hours)
4. ✅ Task 4: Participant session page SWR migration (1 hour)
5. ✅ Task 5: Shared SWR utility (30 min, optional)

**Total Estimated Time:** 4-6 hours

---

## Testing Strategy

### Manual Testing Checklist

**Question Submission:**
- [ ] Submit question - form clears instantly
- [ ] Submit while offline - error shows, form content restored
- [ ] Submit rate-limited - error shows, form content restored
- [ ] Question appears in list within 10s (SWR poll interval)

**Pulse Check:**
- [ ] Click feedback emoji - selection shows instantly
- [ ] Submit while offline - reverts with error message
- [ ] Already submitted (409) - shows as submitted anyway
- [ ] Stats update in question card within 10s

**Host Dashboard:**
- [ ] Questions appear and update every 3s
- [ ] Toggle session active/accepting - updates instantly
- [ ] Switch tabs and return - data refreshes automatically
- [ ] Status change reflects in participant view within 10s
- [ ] Network disconnect/reconnect - recovers gracefully

**Participant Session:**
- [ ] Session data loads on mount
- [ ] Switch tabs and return - session data refreshes
- [ ] Host pauses questions - banner appears within 10s
- [ ] Network disconnect/reconnect - recovers gracefully

### Automated Testing

**No test changes needed** because:
- Tests verify API behavior, not React component state management
- API endpoints unchanged
- Integration tests remain valid

**Optional:** Add component tests for optimistic update behavior if desired.

---

## Code Cleanup Opportunities

After migration is complete, consider:

1. **Remove duplicate fetcher functions** - Each component defines its own fetcher
2. **Standardize error handling** - Consistent error messages and retry logic
3. **Share SWR config** - DRY principle for refresh intervals and options
4. **Add loading skeletons** - Replace spinners with skeleton screens (better UX)

---

## Success Criteria

- ✅ All user actions feel instant (no disabled states except session closed)
- ✅ No manual polling loops (`setInterval` removed from components)
- ✅ Data stays in sync across components and tabs
- ✅ Network errors handled gracefully with automatic retry
- ✅ Code is simpler and easier to maintain
- ✅ No regressions in existing functionality

---

## Rollback Plan

If issues arise:

1. **Partial rollback** - Revert individual components via git
2. **Full rollback** - Revert entire SWR migration PR
3. **Feature flag** - Add environment variable to toggle SWR vs manual polling

SWR is battle-tested and widely used, so rollback is unlikely to be needed.

---

## Future Enhancements (Post-Migration)

Once SWR migration is complete, consider:

1. **Reduce polling intervals** - SWR is efficient enough for 5s or even 3s globally
2. **Add optimistic question deletion** - Host dismisses question instantly
3. **Add optimistic question approval** - Host approves question instantly
4. **Use SWR's `useSWRMutation`** - Specialized hook for POST/PATCH/DELETE operations
5. **Prefetch session data** - Preload data before navigation for instant page loads
6. **Add global SWR config** - Configure defaults in SWRConfig provider

---

## References

- [SWR Documentation](https://swr.vercel.app/)
- [SWR Optimistic Updates](https://swr.vercel.app/docs/mutation#optimistic-updates)
- [Next.js + SWR Best Practices](https://nextjs.org/docs/basic-features/data-fetching/client-side#client-side-data-fetching-with-swr)
