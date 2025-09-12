# Test Backfill Plan

## Overview
This plan outlines the systematic approach to backfill tests for existing functionality in the Hubbly Q&A application. We'll work in a separate `backfill-tests` branch, adding one complete test suite at a time, then merge back to main for a clean history.

## Branch Strategy
- **Working Branch**: `backfill-tests`
- **Merge Strategy**: Squash merge to main for single commit on main, but preserve individual commits in history
- **Testing**: Each test suite must pass before moving to next suite
- **Build Verification**: Always run `npm run build:local` before pushing

## Test Suites to Backfill

### Phase 1: Core Infrastructure (Priority: Critical)

#### 1. Database Business Logic (`__tests__/integration/database-workflows.test.ts`)
**Target**: `src/lib/init-db.ts` (business logic only)
**Test Type**: Integration  
**Estimated Commits**: 1

**Test Coverage**:
- Demo user initialization workflow (business rule: create if none exist)
- Database health check workflow (can we connect and query?)
- Error handling for database failures (business behavior)

**Testing Approach**:
- Use real SQLite in-memory database
- Test actual business workflows, not Prisma internals
- Focus on our logic: "create demo user if none exist"
- Skip testing: Prisma client creation, environment variable parsing

#### 2. Authentication Configuration (`__tests__/utils/auth.test.ts`)
**Target**: `src/lib/auth.ts`
**Test Type**: Unit
**Estimated Commits**: 1

**Test Coverage**:
- NextAuth options configuration
- Google OAuth provider setup
- Session callback functionality
- JWT callback functionality
- Environment variable requirements
- Adapter configuration

**Mock Strategy**:
- Mock NextAuth providers and callbacks
- Mock environment variables
- Mock Prisma adapter

#### 3. Health API Endpoint (`__tests__/integration/health-api.test.ts`)
**Target**: `src/app/api/health/route.ts`
**Test Type**: Integration
**Estimated Commits**: 1

**Test Coverage**:
- GET request handling
- Database connection verification
- Success response format
- Error response handling
- Status codes (200, 503)
- Demo user data in response

**Mock Strategy**:
- Mock database initialization functions
- Test both success and failure scenarios
- Use supertest or Next.js testing utils

### Phase 2: API Routes (Priority: High)

#### 4. NextAuth API Routes (`__tests__/integration/auth-api.test.ts`)
**Target**: `src/app/api/auth/[...nextauth]/route.ts`
**Test Type**: Integration
**Estimated Commits**: 1

**Test Coverage**:
- NextAuth route handler
- Integration with auth configuration
- Session management
- Error handling

**Mock Strategy**:
- Mock NextAuth internals
- Test route configuration
- Verify handler exports

#### 5. Middleware (`__tests__/integration/middleware.test.ts`)
**Target**: `src/middleware.ts`
**Test Type**: Integration
**Estimated Commits**: 1

**Test Coverage**:
- Route protection logic
- Authentication checking
- Redirect behavior
- Public vs protected routes
- Request/response handling

**Mock Strategy**:
- Mock NextRequest/NextResponse
- Mock NextAuth session checking
- Test different route scenarios

### Phase 3: React Components (Priority: Medium)

#### 6. Providers Component (`__tests__/components/Providers.test.tsx`)
**Target**: `src/components/providers.tsx`
**Test Type**: Component
**Estimated Commits**: 1

**Test Coverage**:
- SessionProvider wrapping
- Children rendering
- Context provision
- Props handling

**Mock Strategy**:
- Mock next-auth/react
- Test provider context availability

#### 7. Homepage Component (`__tests__/components/HomePage.test.tsx`)
**Target**: `src/app/page.tsx`
**Test Type**: Component
**Estimated Commits**: 1

**Test Coverage**:
- Initial loading state
- Health status fetching
- Error handling
- Status display rendering
- Link navigation
- Loading states

**Mock Strategy**:
- Mock fetch API
- Mock health API responses
- Test loading, success, and error states

#### 8. Create Session Page (`__tests__/components/CreateSessionPage.test.tsx`)
**Target**: `src/app/create/page.tsx`
**Test Type**: Component
**Estimated Commits**: 1

**Test Coverage**:
- Authentication checking
- Sign-in redirect logic
- Loading states
- Authenticated user display
- Sign-out functionality
- Session status handling

**Mock Strategy**:
- Mock next-auth/react hooks
- Mock session states (loading, authenticated, unauthenticated)
- Test redirect behavior

### Phase 4: Type Definitions (Priority: Low)

#### 9. Type Definitions (`__tests__/types/next-auth.test.ts`)
**Target**: `src/types/next-auth.d.ts`
**Test Type**: Unit
**Estimated Commits**: 1

**Test Coverage**:
- Type augmentation verification
- Session type extensions
- User type extensions
- JWT type extensions

**Mock Strategy**:
- TypeScript compilation tests
- Type assertion tests
- Interface extension verification

## Implementation Steps

### Step 1: Create Branch and Setup
```bash
git checkout -b backfill-tests
git push -u origin backfill-tests
```

### Step 2: For Each Test Suite
1. **Create test file** with comprehensive coverage
2. **Write tests** following existing patterns in `__tests__/`
3. **Run test suite**: `npm run test -- [test-file-pattern]`
4. **Ensure all tests pass**
5. **Run full test suite**: `npm test`
6. **Verify build**: `npm run build:local`
7. **Commit with descriptive message**
8. **Push to branch**: `git push origin backfill-tests`

### Step 3: Final Integration
1. **Run complete test suite**: `npm test`
2. **Generate coverage report**: `npm run test:coverage`
3. **Verify build passes**: `npm run build:local`
4. **Merge to main**:
   ```bash
   git checkout main
   git merge backfill-tests --squash
   git commit -m "Add comprehensive test coverage for existing functionality"
   git push origin main
   ```

## Success Criteria

### Per Test Suite
- ✅ All new tests pass
- ✅ No existing tests broken
- ✅ Build passes locally
- ✅ Meaningful test coverage for target functionality
- ✅ Proper mocking strategies implemented

### Overall Goals
- **Coverage Target**: 80%+ for integration tests, 70%+ for components
- **Test Count**: ~50-70 new tests across all suites
- **Documentation**: Each test file includes clear descriptions and TODOs for future improvements
- **Maintainability**: Tests follow established patterns and are easy to understand

## File Structure After Completion

```
__tests__/
├── components/
│   ├── Button.test.tsx                 # ✅ Existing dummy test
│   ├── HomePage.test.tsx               # 🆕 Homepage component tests
│   ├── CreateSessionPage.test.tsx      # 🆕 Create session page tests
│   └── Providers.test.tsx              # 🆕 Providers component tests
├── integration/
│   ├── health.integration.test.ts      # ✅ Existing dummy test
│   ├── health-api.test.ts              # 🆕 Health API endpoint tests
│   ├── auth-api.test.ts                # 🆕 NextAuth API tests
│   └── middleware.test.ts              # 🆕 Middleware tests
├── utils/
│   ├── validation.test.ts              # ✅ Existing dummy test
│   ├── database.test.ts                # 🆕 Database utility tests
│   └── auth.test.ts                    # 🆕 Auth configuration tests
├── types/
│   └── next-auth.test.ts               # 🆕 Type definition tests
└── setup/
    └── test-utils.tsx                  # ✅ Existing test utilities
```

## Risk Mitigation

### Database Testing Risks
- **Issue**: Tests may fail without real database
- **Mitigation**: Use SQLite in-memory for integration tests, proper mocking for unit tests

### Authentication Testing Risks
- **Issue**: NextAuth mocking complexity
- **Mitigation**: Focus on configuration testing, mock external dependencies

### Component Testing Risks
- **Issue**: Complex state management
- **Mitigation**: Use React Testing Library best practices, test user interactions

### Build/Environment Risks
- **Issue**: Environment variable dependencies
- **Mitigation**: Proper mocking, test environment configuration

## Timeline Estimate

- **Phase 1** (Critical): 3 test suites, ~1-2 days
- **Phase 2** (High): 2 test suites, ~1 day  
- **Phase 3** (Medium): 3 test suites, ~1-2 days
- **Phase 4** (Low): 1 test suite, ~0.5 days
- **Integration & Cleanup**: ~0.5 days

**Total Estimated Time**: 4-6 days for comprehensive test coverage

## Notes

- This plan focuses on existing functionality only
- New features should include tests as part of their implementation
- Regular test runs ensure no regressions during backfill process
- Consider updating TESTING_STRATEGY.md after completion with lessons learned