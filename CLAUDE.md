# Claude Commands and Project Setup

## Available Commands

### `/implement-feature`

Creates user stories from a high-level feature description. Breaks down features into implementable tasks with proper ordering and dependencies.

Usage: `/implement-feature "Session creation"`

### `/implement-story`

Implements a single user story from a stories file. Automatically finds the first incomplete story and implements it.

Usage: `/implement-story feature_session_creation.md`

### `/check-conflicts`

Analyzes projectmanagement/\* files and CLAUDE.md for conflicting information that could confuse an LLM. Reviews technical specifications, product requirements, and setup instructions for inconsistencies.

Usage: `/check-conflicts`

## Project Structure

- **Frontend**: Next.js 14+ with React 18+ and TypeScript
- **Backend**: Next.js API Routes with Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js with Google OAuth
- **Styling**: Tailwind CSS (to be added)

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production (CI/deployment only)
- `npm run build:local` - Build for local verification
- `npm run lint` - Run ESLint
- `npm start` - Start production server

### ⚠️ CRITICAL: Pre-Push Requirements

**ALWAYS run `npm run build:local` before pushing to git!**

1. Run tests: `npm test`
2. Verify build passes: `npm run build:local`
3. Check linting: `npm run lint`
4. Only then push to git

Never push without verifying the build passes locally. Use `build:local`, not `build`.

## Git Workflow

### Conventional Commits

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for all commit messages.

**Format**: `<type>: <description>`

**Common types**:
- `feat:` - New features
- `fix:` - Bug fixes
- `refactor:` - Code restructuring without changing behavior
- `test:` - Adding or updating tests
- `docs:` - Documentation changes
- `chore:` - Maintenance tasks (dependencies, configuration)
- `build:` - Build system changes
- `ci:` - CI/CD pipeline changes

**Examples**:
```
feat: add question voting endpoint
fix: correct session expiration validation
refactor: simplify session code generation logic
test: add integration tests for audience participation
docs: update API endpoint documentation
chore: upgrade Next.js to 15.5.9
```

## Database Commands

- `npx prisma generate` - Generate Prisma client
- `npx prisma migrate dev` - Run database migrations in development
- `npx prisma studio` - Open Prisma Studio (database GUI)

### Database Schema

**Question Status Values:**
- `pending` - Question submitted, awaiting host approval
- `approved` - Question approved and visible to participants
- `dismissed` - Question dismissed by host (not visible)
- `answered` - Question marked as answered (generic)
- `being_answered` - Question currently being addressed
- `answered_live` - Question answered during live session
- `answered_via_docs` - Question answered in documentation

**Pulse Check Feedback:**
- Model: `PulseCheckFeedback` - Stores emoji feedback on answered questions
- Feedback types: `helpful` (💚), `neutral` (💛), `not_helpful` (🔴)
- Unique constraint on `[questionId, participantIp]` prevents duplicate feedback per question
- Automatically deleted when question is deleted (cascade)

## Testing Setup

- **Test Framework**: Jest with React Testing Library
- **Test Database**: SQLite (in-memory for isolation)
- **Test Configuration**: `.env.test` - Test environment variables
- **Test Database Schema**: `prisma/schema.test.prisma` - Separate test schema
- **Test Execution**: Serial (maxWorkers: 1) to avoid database contention

### Test Files

- `__tests__/integration/sessions.test.ts` - Session business logic integration tests
- `__tests__/utils/session-utils.test.ts` - Session utilities unit tests
- `__tests__/integration/session-lifecycle.test.ts` - Complete session workflow tests
- `__tests__/setup/test-db.ts` - Test database utilities
- `jest.config.js` - Jest configuration with Next.js support
- `jest.setup.js` - Global test setup and database cleanup

## Key Files

- `projectmanagement/PRODUCT_SPEC.md` - Product requirements and features
- `projectmanagement/TECHNICAL_SPEC.md` - Technical architecture and implementation details
- `projectmanagement/feature_*.md` - User stories for specific features
- `prisma/schema.prisma` - Database schema and models (includes NextAuth tables)
- `src/lib/auth.ts` - NextAuth.js configuration with Google OAuth
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth.js API routes
- `src/app/api/sessions/route.ts` - Session creation API endpoint (POST)
- `src/app/api/sessions/[code]/route.ts` - Session retrieval (GET) and update (PATCH) API endpoints
- `src/app/create/page.tsx` - Session creation page with form and authentication
- `src/app/session/[code]/host/page.tsx` - Host dashboard for session management
- `src/lib/session-utils.ts` - Session code generation and validation utilities
- `src/types/session.ts` - TypeScript types for session entities and API responses
- `src/middleware.ts` - Route protection middleware
- `src/types/next-auth.d.ts` - NextAuth TypeScript type extensions
- `.env` - Environment variables (not committed to git)
- `.env.example` - Environment variables template
