# Hubbly Testing Strategy

## Overview
Comprehensive testing approach prioritizing integration tests with database interactions, focusing on developer experience and single-command execution.

## Testing Framework
- **Jest** - Primary test runner and assertion library
- **React Testing Library** - Component testing with user-focused approach
- **SQLite** - In-memory test database for integration tests
- **Supertest** - HTTP API testing (optional, for API route testing)

## Test Types & Priorities

### 1. Integration Tests (Primary Focus)
Test complete user workflows including database operations:
- API routes with database interactions
- NextAuth authentication flows
- Session creation and management
- Question submission and voting
- Real-time features

### 2. Component Tests
React components with user interactions:
- Form submissions
- UI state management
- User event handling
- Accessibility testing

### 3. Unit Tests
Individual functions and utilities:
- Data validation functions
- Utility functions
- Business logic helpers

### 4. Database Migration Tests
Ensure schema changes work correctly:
- Migration rollback/forward testing
- Schema validation
- Seed data integrity

## Database Testing Approach

### SQLite In-Memory Strategy
- **Zero setup** - No external database dependencies
- **Fresh database per test suite** - Complete isolation
- **Fast reset** - Quick test execution
- **Migration testing** - Full Prisma migration support
- **Single command** - `npm test` runs everything

### Test Database Configuration
```typescript
// Test-specific Prisma configuration
const testDatabaseUrl = process.env.NODE_ENV === 'test' 
  ? 'file:./test.db' 
  : process.env.DATABASE_URL;
```

## Test Organization

### File Structure
```
__tests__/
├── integration/          # API routes + database
│   ├── auth.test.ts
│   ├── sessions.test.ts
│   └── questions.test.ts
├── components/           # React component tests
│   ├── CreateSessionForm.test.tsx
│   └── QuestionList.test.tsx
├── utils/               # Unit tests
│   └── validation.test.ts
└── setup/
    ├── jest.setup.ts    # Global test setup
    └── test-utils.tsx   # Testing utilities
```

### Naming Conventions
- Integration tests: `*.integration.test.ts`
- Component tests: `*.test.tsx`
- Unit tests: `*.test.ts`
- Test utilities: `test-utils.ts`

## Test Commands

### Primary Commands
- `npm test` - Run all tests
- `npm run test:watch` - Watch mode for development
- `npm run test:coverage` - Generate coverage report

### Additional Commands
- `npm run test:integration` - Run only integration tests
- `npm run test:components` - Run only component tests
- `npm run test:unit` - Run only unit tests

## Coverage Targets
- **Integration Tests**: 80%+ of API routes and database operations
- **Component Tests**: 70%+ of UI components
- **Overall Coverage**: 75%+ code coverage

## Test Data Strategy

### Test Fixtures
- Reusable test data factories
- Consistent user/session/question objects
- Isolated test data per test suite

### Database State Management
- Fresh SQLite database per test suite
- Prisma migrations run automatically
- No cleanup required (in-memory disposal)

## Continuous Integration
- All tests must pass before merge
- Coverage reports generated on CI
- Fast feedback loop (< 2 minutes total test time)

## Migration Testing Approach

### Schema Validation
- Test forward migrations
- Test migration rollbacks
- Verify data integrity during migrations
- Validate foreign key constraints

### Implementation
```typescript
describe('Database Migrations', () => {
  beforeAll(async () => {
    // Run all migrations on fresh SQLite DB
    await prisma.$executeRaw`...`;
  });
  
  // Test migration behavior
});
```

## Developer Experience Goals
1. **Zero setup** - Clone repo, `npm install`, `npm test` works
2. **Fast feedback** - Tests complete in under 2 minutes
3. **Clear failures** - Descriptive error messages and stack traces
4. **Single command** - No separate database setup required
5. **Watch mode** - Instant feedback during development