# Bug: Race Conditions in Optimistic Updates

## Issue Summary

When users take two modification actions in quick succession, the second optimistic update gets clobbered by the server response from the first action, leading to inconsistent client state.

## Specific Example (Discovered)

**Repro Steps:**
1. Submit a new question (optimistic: voteCount = 0)
2. Immediately upvote the question (optimistic: voteCount = 1)
3. Server responds to question submission (voteCount = 0)
4. **Bug:** Vote count displays "1 Vote" then jumps back to "0 Vote"

**Root Cause:**
- Question submission adds optimistic question with voteCount: 0
- User votes, updates cache to voteCount: 1
- Server responds to submission with voteCount: 0
- Cache revalidation overwrites the vote

## General Pattern

This is a **systemic issue** affecting any rapid sequential actions:
- Submit question → Vote on it
- Vote → Host marks as "being answered"
- Submit question → Another user votes
- Mark answered → Participant gives pulse feedback

**Current Architecture:**
- Using SWR for data fetching
- Manual optimistic updates via `mutate()`
- Not using SWR 2.0's conflict resolution features
- Each action independently manages cache updates
- Race conditions between optimistic updates and server responses

## Why This Happens

1. **Not using `populateCache`**: SWR 2.0 has merge strategies, but we're not using them
2. **Full list revalidation**: Calling `mutate(key)` without merge logic replaces entire cache
3. **No coordination**: Each mutation doesn't know about other in-flight mutations
4. **Missing `rollbackOnError`**: No automatic rollback on failures

## Current Implementation (Problematic)

```typescript
// Question submission - just revalidates, clobbers votes
mutate(`/api/sessions/${sessionCode}/questions`);

// Voting - manual cache update, gets overwritten by submissions
mutate(key, (current) => ({ ...current, voteCount: current.voteCount + 1 }));
```

---

## Proposed Solution: Use SWR 2.0's `populateCache`

### Overview

SWR 2.0 introduced `populateCache` and `rollbackOnError` specifically for this use case. We should use these built-in features instead of manual cache management.

### Implementation Pattern

```typescript
// Question submission with proper merge
const handleSubmit = async () => {
  const questionId = createId();

  mutate(
    `/api/sessions/${sessionCode}/questions`,
    async () => {
      const response = await fetch(...);
      return response.json();
    },
    {
      optimisticData: (currentData) => ({
        questions: [optimisticQuestion, ...currentData.questions],
        total: currentData.questions.length + 1
      }),
      rollbackOnError: true,
      populateCache: (serverResponse, currentCache) => {
        // Merge server response with current cache
        // This preserves any votes that happened while request was in flight
        return {
          questions: currentCache.questions.map(q =>
            q.id === serverResponse.question.id
              ? { ...serverResponse.question, voteCount: q.voteCount }
              : q
          ),
          total: currentCache.questions.length
        };
      },
      revalidate: false // Trust our merge logic
    }
  );
};
```

### Implementation Plan

**Phase 1: Question Submission** (1-2 hours)
- Update `QuestionSubmitForm.tsx` to use `populateCache`
- Add merge logic to preserve vote counts
- Test: Submit → Vote → Verify vote persists
- Test: Submit with error → Verify rollback

**Phase 2: Voting** (1 hour)
- Update `QuestionCard.tsx` voting to use `populateCache`
- Add merge logic to preserve other optimistic updates
- Test: Vote → Submit → Verify vote persists
- Test: Vote on multiple questions rapidly

**Phase 3: Host Status Updates** (1 hour)
- Update `HostQuestionList.tsx` to use `populateCache`
- Add merge logic to preserve votes and pulse feedback
- Test: Mark answered → Participant votes → Verify both persist
- Test: Being answered → Pulse feedback

**Phase 4: Pulse Check Feedback** (30 min)
- Update `PulseCheck.tsx` to use `populateCache`
- Test: Pulse feedback → Status change → Verify both persist

**Phase 5: Integration Testing** (1-2 hours)
- Test all combinations of rapid actions
- Add automated tests for race conditions
- Performance testing with network throttling

### Pros

✅ **Low effort**: Uses existing SWR, no migration needed
✅ **Built-in**: Features designed for this exact problem
✅ **Incremental**: Can fix one mutation at a time
✅ **Type-safe**: TypeScript support already configured
✅ **Smaller bundle**: No additional dependencies
✅ **Familiar**: Team already knows SWR patterns

### Cons

❌ **Manual merge logic**: Need to write merge strategy for each mutation
❌ **Error-prone**: Easy to forget edge cases in merge functions
❌ **Limited devtools**: SWR devtools not as comprehensive
❌ **No query cancellation**: Can't cancel in-flight requests
❌ **Verbose**: More boilerplate than TanStack Query mutations

### Edge Cases to Handle

1. **Multiple concurrent mutations**: User submits 2 questions rapidly
2. **Mutation during revalidation**: User votes while background refresh happening
3. **Partial failures**: Some mutations succeed, some fail
4. **Stale closures**: Merge function capturing old state

---

## Alternative Solution: Migrate to TanStack Query

### Overview

TanStack Query (formerly React Query) is purpose-built for complex client state scenarios with built-in optimistic updates, query cancellation, and conflict resolution.

### Implementation Pattern

```typescript
// Question submission with TanStack Query
const submitMutation = useMutation({
  mutationFn: submitQuestion,
  onMutate: async (newQuestion) => {
    // Cancel outgoing refetches to prevent overwriting our optimistic update
    await queryClient.cancelQueries({ queryKey: ['questions', sessionCode] });

    // Snapshot current state for rollback
    const previousQuestions = queryClient.getQueryData(['questions', sessionCode]);

    // Optimistically update cache
    queryClient.setQueryData(['questions', sessionCode], (old) => ({
      questions: [newQuestion, ...old.questions],
      total: old.questions.length + 1
    }));

    // Return context for rollback
    return { previousQuestions };
  },
  onError: (err, newQuestion, context) => {
    // Automatic rollback on error
    queryClient.setQueryData(['questions', sessionCode], context.previousQuestions);
  },
  onSettled: () => {
    // Ensure server state is fresh
    queryClient.invalidateQueries({ queryKey: ['questions', sessionCode] });
  }
});
```

### Migration Plan

**Phase 1: Core query replacement** (2-3 hours)
- Install `@tanstack/react-query`
- Set up `QueryClientProvider` in app layout
- Replace SWR `useSWR` with `useQuery` for question list
- Migrate question submission to `useMutation`
- Update tests to use TanStack Query testing utilities

**Phase 2: Additional mutations** (3-4 hours)
- Migrate voting mutation with optimistic updates
- Migrate host status update mutation
- Migrate pulse check mutation
- Session data queries with stale-while-revalidate

**Phase 3: Advanced features** (2-3 hours)
- Configure devtools for debugging
- Add mutation queue for offline support
- Implement prefetching for better UX
- Add query retry strategies

**Phase 4: Testing & cleanup** (2-3 hours)
- Full regression testing
- Remove SWR dependencies
- Update documentation
- Performance benchmarking

**Total estimated effort**: 9-13 hours

### Pros

✅ **Query cancellation**: Built-in prevention of race conditions
✅ **Structured lifecycle**: `onMutate`, `onError`, `onSettled` hooks
✅ **Better devtools**: React Query Devtools for visual debugging
✅ **Context snapshots**: Automatic state management for rollback
✅ **Industry standard**: Well-documented, large ecosystem
✅ **TypeScript**: Excellent type inference
✅ **Offline support**: Built-in mutation queue

### Cons

❌ **Migration effort**: Need to replace all SWR usage
❌ **Larger bundle**: ~13kb gzipped vs SWR's 5kb
❌ **Learning curve**: Team needs to learn new patterns
❌ **Breaking changes**: May affect SSR/hydration
❌ **Test updates**: Different testing utilities
❌ **All or nothing**: Hard to migrate incrementally

### Breaking Changes

- Different cache structure (query keys vs SWR keys)
- SSR hydration patterns differ from SWR
- Different error handling patterns
- Polling/refetch configuration syntax differs

---

## Comparison & Recommendation

| Aspect | SWR 2.0 `populateCache` | TanStack Query |
|--------|-------------------------|----------------|
| **Implementation Time** | 4-6 hours | 9-13 hours |
| **Risk** | Low (incremental) | Medium (migration) |
| **Maintainability** | Medium (manual merges) | High (structured) |
| **Bundle Size** | +0kb (already using SWR) | +8kb (additional lib) |
| **Learning Curve** | Low (familiar) | Medium (new patterns) |
| **Long-term** | May need migration later | Future-proof |
| **Devtools** | Basic | Excellent |

### Recommended Approach

**Start with SWR 2.0 `populateCache`**:
1. Fix the immediate bug with low risk
2. Validate the approach works for our use cases
3. Gain experience with conflict resolution patterns

**Evaluate TanStack Query later if**:
- Merge logic becomes too complex/brittle
- Need offline support or mutation queues
- Team wants better devtools for debugging
- Planning more complex optimistic update scenarios

This phased approach minimizes risk while solving the immediate problem.

---

## Files Affected

**For SWR 2.0 approach:**
- `src/components/participant/QuestionSubmitForm.tsx` - add `populateCache` to submission
- `src/components/participant/QuestionCard.tsx` - add `populateCache` to voting
- `src/components/host/HostQuestionList.tsx` - add `populateCache` to status updates
- `src/components/participant/PulseCheck.tsx` - add `populateCache` to feedback

**For TanStack Query approach:**
- All of the above, plus:
- `src/app/layout.tsx` - add `QueryClientProvider`
- `src/lib/query-client.ts` - create query client config
- `src/hooks/useQuestions.ts` - migrate to `useQuery`
- `src/hooks/useSubmitQuestion.ts` - migrate to `useMutation`
- `src/hooks/useVote.ts` - migrate to `useMutation`
- `package.json` - add `@tanstack/react-query`
- Remove `src/lib/swr-utils.ts`

## Priority

**High** - Affects core user experience and data consistency

## References

**SWR 2.0:**
- [Mutation & Revalidation - SWR](https://swr.vercel.app/docs/mutation)
- [Automatic Revalidation - SWR](https://swr.vercel.app/docs/revalidation)
- [Announcing SWR 2.0](https://swr.vercel.app/blog/swr-v2)
- [Problem with optimistic updates in SWR 2](https://github.com/vercel/swr/discussions/2638)

**TanStack Query:**
- [TanStack Query - Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [Migration guide: SWR to TanStack Query](https://tanstack.com/query/latest/docs/framework/react/comparison)
- [TanStack Query Devtools](https://tanstack.com/query/latest/docs/framework/react/devtools)
