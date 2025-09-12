# Hubbly Testing Strategy

## Overview
Behavior-focused testing approach that validates business logic and user workflows while avoiding over-testing of library functionality. Prioritize integration tests with minimal mocking.

## Testing Philosophy
**Test behavior, not implementation. Avoid mocks where possible.**

### What to Test
- Business logic and domain rules
- User workflows and interactions
- API contracts and data flow
- Error handling and edge cases
- Integration between our code components

### What NOT to Test
- Third-party library internals (Prisma, NextAuth, React)
- Framework behavior (Next.js routing, React rendering)
- Obvious getter/setter functions
- Configuration objects without logic
- Type definitions without runtime behavior

## Testing Framework
- **Jest** - Primary test runner and assertion library
- **React Testing Library** - Component testing with user-focused approach
- **SQLite** - In-memory test database for integration tests
- **Real implementations** where possible, minimal mocking

## Test Types & Priorities

### 1. Integration Tests (Primary Focus)
Test complete business workflows end-to-end:
- API routes with real database operations (SQLite in-memory)
- User authentication flows  
- Session creation and management workflows
- Question submission and voting behavior
- Real-time features with actual data flow

### 2. Component Tests
Test user-facing behavior and interactions:
- User interactions and form submissions
- UI state changes in response to user actions
- Error states and loading behaviors
- Accessibility and user experience

### 3. Business Logic Tests
Test domain-specific rules and validations:
- Custom validation functions
- Business rule implementations
- Data transformation logic
- Error handling strategies

### 4. Contract Tests
Ensure interfaces work as expected:
- API input/output contracts
- Component prop interfaces
- External service integrations

## Mocking Strategy

### When to Mock
- **External APIs** - Third-party services we don't control
- **Environment-specific resources** - File system, network calls
- **Slow operations** - Only when they significantly impact test performance
- **Non-deterministic behavior** - Random number generation, current time

### When NOT to Mock
- **Database operations** - Use SQLite in-memory instead
- **Internal business logic** - Test the real implementation
- **Framework behavior** - Don't mock Next.js, React, Prisma
- **Simple utilities** - Test actual validation functions, formatters

### Preferred Alternatives to Mocking
- **In-memory databases** - SQLite for database tests
- **Test doubles** - Real implementations with test data
- **Environment variables** - Set test-specific config values
- **Dependency injection** - Pass test implementations where needed

## Database Testing Approach

### SQLite In-Memory Strategy
- **Real database operations** - No mocking Prisma or SQL
- **Fresh database per test suite** - Complete isolation
- **Fast reset** - Quick test execution with real data
- **Migration testing** - Full Prisma migration support
- **Business logic focus** - Test our database interactions, not Prisma internals

### Test Database Configuration
```typescript
// Test-specific Prisma configuration for real database operations
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
**Focus on meaningful coverage, not percentage targets.**

### Quality over Quantity
- **Business Logic**: 100% of critical business workflows tested
- **User Journeys**: All major user flows covered end-to-end
- **Error Handling**: Key error scenarios and edge cases tested
- **API Contracts**: All public API endpoints tested with realistic data

### Practical Coverage Goals
- **Integration Tests**: Cover all business-critical workflows
- **Component Tests**: Focus on user interactions and state changes
- **Avoid Coverage Theater**: Don't test simple getters, configurations, or library wrappers

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