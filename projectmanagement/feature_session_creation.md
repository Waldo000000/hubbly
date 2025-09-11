# Feature: Session Creation

## User Story 1: Set up Prisma ORM and database schema

**Goal:** Establish database foundation with Users and Sessions tables using Prisma ORM

**Status:** Not Started

**Tasks:**

1. Install Prisma ORM and PostgreSQL adapter
2. Create prisma/schema.prisma with Users and Sessions models
3. Set up database connection configuration
4. Create and run initial migration
5. Generate Prisma client

**Acceptance Criteria:**

- Run prettier over all new files to format them
- Run build to ensure no errors
- Run linter to ensure no errors
- Update CLAUDE.md with new details
- Mark the story as done in the markdown file for it.

## User Story 2: Implement NextAuth.js Google OAuth authentication

**Goal:** Enable host authentication using Google OAuth through NextAuth.js

**Status:** Not Started

**Tasks:**

1. Install NextAuth.js and Google OAuth provider
2. Create NextAuth configuration with Google provider
3. Set up authentication API routes in app/api/auth
4. Configure environment variables for Google OAuth
5. Create middleware for protected routes

**Acceptance Criteria:**

- Run prettier over all new files to format them
- Run build to ensure no errors
- Run linter to ensure no errors
- Update CLAUDE.md with new details
- Mark the story as done in the markdown file for it.

## User Story 3: Create API types and session creation endpoint

**Goal:** Implement backend logic for creating sessions with unique codes and proper validation

**Status:** Not Started

**Tasks:**

1. Define TypeScript interfaces for Session and User entities
2. Create session code generation utility (6-digit alphanumeric, unique)
3. Implement POST /api/sessions endpoint for session creation
4. Add input validation for title and description
5. Implement GET /api/sessions/[code] endpoint for session retrieval

**Acceptance Criteria:**

- Run prettier over all new files to format them
- Run build to ensure no errors
- Run linter to ensure no errors
- Update CLAUDE.md with new details
- Mark the story as done in the markdown file for it.

## User Story 4: Create backend tests for session creation API

**Goal:** Ensure reliability and correctness of session creation endpoints through comprehensive testing

**Status:** Not Started

**Tasks:**

1. Set up testing framework (Jest) for API testing
2. Create test utilities for database setup and cleanup
3. Write tests for POST /api/sessions endpoint (success and error cases)
4. Write tests for GET /api/sessions/[code] endpoint
5. Test session code uniqueness and generation logic

**Acceptance Criteria:**

- Run prettier over all new files to format them
- Run build to ensure no errors
- Run linter to ensure no errors
- Update CLAUDE.md with new details
- Mark the story as done in the markdown file for it.

## User Story 5: Create authentication and session management hooks

**Goal:** Build React hooks for managing authentication state and session operations

**Status:** Not Started

**Tasks:**

1. Create useAuth hook for managing authentication state
2. Create useSession hook for session CRUD operations
3. Implement error handling and loading states
4. Add TypeScript types for hook return values
5. Create custom hook for session creation with validation

**Acceptance Criteria:**

- Run prettier over all new files to format them
- Run build to ensure no errors
- Run linter to ensure no errors
- Update CLAUDE.md with new details
- Mark the story as done in the markdown file for it.

## User Story 6: Build session creation form and flow

**Goal:** Create user interface for session creation with proper validation and user experience

**Status:** Not Started

**Tasks:**

1. Create /create page with authentication requirement
2. Build CreateSessionForm component with title and description fields
3. Implement form validation and error messaging
4. Add loading states and success/error handling
5. Redirect to host dashboard after successful creation

**Acceptance Criteria:**

- Run prettier over all new files to format them
- Run build to ensure no errors
- Run linter to ensure no errors
- Update CLAUDE.md with new details
- Mark the story as done in the markdown file for it.

## User Story 7: Create basic host dashboard

**Goal:** Build dashboard where hosts can view session details, code, and sharing options

**Status:** Not Started

**Tasks:**

1. Create /session/[code]/host page with authentication requirement
2. Display session information (title, description, code)
3. Generate and display shareable link
4. Implement QR code generation for session link
5. Add basic styling and responsive design

**Acceptance Criteria:**

- Run prettier over all new files to format them
- Run build to ensure no errors
- Run linter to ensure no errors
- Update CLAUDE.md with new details
- Mark the story as done in the markdown file for it.