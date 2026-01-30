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
- No built-in conflict resolution
- Each action independently manages cache updates
- Race conditions between optimistic updates and server responses

## Why This Happens

1. **SWR design**: Simple cache, not designed for complex optimistic updates
2. **No version tracking**: Can't detect if cached data is newer than server response
3. **Full list revalidation**: Refetching entire list clobbers individual optimistic changes
4. **No merge strategy**: No way to preserve optimistic updates when server responds

## Attempted Fixes

**Partial fix applied** (for question submission only):
```typescript
// Merge server response with current cache
return {
  ...serverQuestion,
  voteCount: q.voteCount, // Keep current vote count
};
```

**Problem:** This is a band-aid. We'd need similar logic for:
- Every field that can be optimistically updated
- Every API endpoint
- Every combination of actions
- Very brittle and error-prone

## Recommended Solution: Migrate to TanStack Query

### Why TanStack Query?

**Built-in optimistic update patterns:**
```typescript
useMutation({
  mutationFn: submitQuestion,
  onMutate: async (newQuestion) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['questions'] })

    // Snapshot current state
    const previousQuestions = queryClient.getQueryData(['questions'])

    // Optimistically update
    queryClient.setQueryData(['questions'], (old) => [...old, newQuestion])

    // Return context for rollback
    return { previousQuestions }
  },
  onError: (err, newQuestion, context) => {
    // Rollback on error
    queryClient.setQueryData(['questions'], context.previousQuestions)
  },
  onSettled: () => {
    // Refetch to ensure sync
    queryClient.invalidateQueries({ queryKey: ['questions'] })
  }
})
```

**Key advantages:**
1. **Query cancellation**: Prevents race conditions by canceling in-flight requests
2. **Context snapshots**: Automatic rollback on error
3. **Invalidation strategies**: Smart refetching without clobbering optimistic updates
4. **Mutation callbacks**: Structured lifecycle for optimistic updates
5. **Devtools**: Visual debugging of cache state and mutations
6. **Better TypeScript**: Stronger typing for mutations and queries

### Migration Effort

**Phase 1: Core query replacement**
- Replace SWR with TanStack Query for question list
- Migrate question submission mutation
- Migrate voting mutation

**Phase 2: Additional features**
- Session data queries
- Host question management
- Pulse check mutations

**Phase 3: Advanced features**
- Optimistic updates with proper rollback
- Mutation queue for offline support
- Prefetching for better UX

### Breaking Changes / Testing

- Full regression testing needed
- May affect SSR/hydration (TanStack Query has different patterns)
- Update tests to use TanStack Query testing utils

## Workarounds (Short-term)

If not migrating immediately:

1. **Disable rapid actions**: Add loading states to prevent quick succession
2. **Delay revalidation**: Wait longer before refetching from server
3. **Manual merge logic**: Add merge strategies for every field (brittle)
4. **Disable optimistic updates**: Remove them entirely (poor UX)

## Files Affected

- `src/components/participant/QuestionSubmitForm.tsx` - submission optimistic update
- `src/components/participant/QuestionCard.tsx` - voting optimistic update
- `src/components/host/HostQuestionList.tsx` - status update optimistic update
- `src/lib/swr-utils.ts` - current SWR utilities
- All API route handlers (unchanged, just clients)

## Priority

**High** - Affects core user experience and data consistency

## References

- [TanStack Query docs - Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [SWR limitations with mutations](https://swr.vercel.app/docs/mutation#optimistic-updates)
- [Migration guide: SWR to TanStack Query](https://tanstack.com/query/latest/docs/framework/react/comparison)
