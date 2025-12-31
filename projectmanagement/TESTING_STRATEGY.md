# Hubbly Testing Strategy

## Overview

Pragmatic testing approach focused on business logic and core functionality to enable rapid prototyping while maintaining reliability. Prioritize simplicity and essential business rule validation over comprehensive coverage.

## Testing Philosophy

**Test business logic that matters for the product. Favor simplicity and rapid prototyping over exhaustive coverage.**

### Rapid Prototyping First

- Get working features tested quickly
- Avoid over-engineering test infrastructure
- Focus on business logic, not framework edge cases
- Prefer working code over perfect test coverage

### What to Test (Priority Order)

1. **Core business logic** - Session creation, validation, data rules
2. **Essential user workflows** - Basic happy paths that users depend on
3. **Critical business rules** - Code generation, uniqueness, expiration
4. **Basic data relationships** - User sessions, questions, votes

### What NOT to Test

- Third-party library internals (Prisma, NextAuth, React)
- Framework behavior (Next.js routing, React rendering)
- HTTP request/response mechanics - focus on business logic
- Comprehensive error scenarios - test main cases only
- UI component rendering details - prioritize business logic over UI
- Complex edge cases during rapid prototyping phase

## Testing Framework

- **Jest** - Primary test runner and assertion library
- **React Testing Library** - Component testing (minimal, business logic focused)
- **SQLite** - Fast, simple test database for business logic testing
- **Real implementations** for business logic, minimal mocking

## Test Types & Priorities

### 1. Business Logic Tests (Primary Focus)

Test core domain functionality and rules:

- Session creation, validation, and lifecycle
- Code generation and uniqueness rules
- Data transformations and business calculations
- Essential validation functions

### 2. Integration Tests (Selective)

Test key workflows with real database operations:

- End-to-end session lifecycle (create → retrieve → use)
- Basic database relationships and data flow
- Critical business workflows that users depend on
- Focus on business logic, not HTTP mechanics

### 3. Component Tests (Minimal)

Test only when business logic is involved:

- Form validation behavior with real business rules
- Components that contain significant business logic
- Skip pure UI rendering tests - focus on business behavior

### 4. Contract Tests (As Needed)

Only test interfaces that encapsulate business logic:

- Critical data transformation interfaces
- Business rule boundary definitions

## Mocking Strategy (Keep It Simple)

### When to Mock

- **External APIs** - Third-party services we don't control
- **Non-deterministic behavior** - Only when it breaks test reliability
- **Slow operations** - Only if they make tests noticeably slow

### When NOT to Mock (Prioritize Real Implementations)

- **Business logic** - Always test the real implementation
- **Database operations** - Use fast SQLite instead of mocking
- **Framework behavior** - Don't mock Next.js, React, Prisma
- **Validation functions** - Test actual business rule implementations

### Preferred Alternatives to Mocking

- **SQLite database** - Fast, simple, real database operations
- **Test data** - Real objects with test values
- **Environment variables** - Simple test configuration
- **Keep it simple** - Avoid complex mocking setups

## Database Testing Approach

### SQLite Strategy (Simple & Fast)

- **Real database operations** - No mocking Prisma or business logic
- **Fast SQLite database** - No Docker complexity, just works
- **Automatic cleanup** - Fresh state between tests
- **Business logic focus** - Test our code, not Prisma internals

### Test Database Configuration

```typescript
// .env.test
DATABASE_URL = "file:./test.db";

// Automatic test database setup with SQLite
// - Fast startup (no containers)
// - Isolated test environment
// - Real database operations
// - Simple cleanup between tests
```

### Why SQLite Over Docker PostgreSQL

- **Rapid prototyping** - No Docker setup complexity
- **Fast execution** - Immediate test startup
- **Simple CI/CD** - No container management
- **Good enough** - SQLite covers business logic testing needs
- **Production differences** - Acceptable trade-off for speed and simplicity

## Test Organization (Keep It Simple)

### File Structure

```
__tests__/
├── integration/          # End-to-end business workflows
│   └── session-lifecycle.test.ts
├── components/           # Only when business logic involved
│   └── [minimal component tests]
├── utils/               # Business logic tests
│   └── validation.test.ts
└── setup/
    ├── test-db.ts       # Simple SQLite test utilities
    └── test-factories.ts # Basic test data creation
```

### Naming Conventions (Simple)

- Business logic tests: `*.test.ts`
- Integration tests: `*.test.ts` (in integration folder)
- Component tests: `*.test.tsx` (only when needed)

## Test Commands (Keep It Simple)

### Primary Commands

- `npm test` - Run all tests (main command)
- `npm run test:watch` - Watch mode for development

### Optional Commands (If Needed)

- `npm run test:integration` - Run integration tests only
- `npm run test:unit` - Run business logic tests only
- `npm run test:coverage` - Coverage when needed for analysis

## Coverage Philosophy

**Test what matters for the product, not what looks good in reports.**

### Pragmatic Coverage Goals

- **Core business logic**: Essential rules and validations tested
- **Key user workflows**: Main happy paths working
- **Critical business rules**: Session codes, uniqueness, validation
- **Skip coverage theater**: Don't test framework code or simple utilities

## Test Data Strategy (Minimal)

### Simple Test Data

- Basic factories only when needed for business logic testing
- Real objects with test values
- Keep test data creation simple and straightforward

### Database State Management

- SQLite database with automatic cleanup
- Fresh state between tests (handled automatically)
- No complex container management needed

## Continuous Integration (Simplified)

- All tests must pass before merge
- Fast feedback loop (tests should complete quickly)
- Keep CI simple - no complex Docker orchestration

## Developer Experience Goals (Rapid Prototyping Focus)

1. **Minimal setup** - Clone repo, `npm test` works immediately
2. **Fast feedback** - Tests complete quickly (SQLite advantage)
3. **Clear failures** - Focus on business logic failures that matter
4. **No infrastructure complexity** - No Docker, containers, or orchestration
5. **Simple local development** - `npm test` and you're good to go
