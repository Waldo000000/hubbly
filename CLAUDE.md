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
- **Styling**: Tailwind CSS v4

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

## ⚠️ CRITICAL: Environment Files

### `.env.local` - NEVER Modify Automatically

**ABSOLUTE RULE**: NEVER automatically modify, overwrite, or suggest changes to `.env.local` without explicit user permission.

**Why**:

- Contains user's personal credentials (Google OAuth, API keys)
- Contains production secrets and tokens
- User has manually configured sensitive values
- Accidental overwrites cause loss of irreplaceable credentials

**Correct Approach**:

1. ✅ If config changes are needed, ask user first: "Should I update .env.local with X?"
2. ✅ Suggest changes user can make manually
3. ✅ Provide example values in `.env.example` instead
4. ✅ Document required variables in README.md

**Incorrect Approach**:

1. ❌ NEVER use Write tool on `.env.local`
2. ❌ NEVER overwrite existing values
3. ❌ NEVER assume values can be regenerated
4. ❌ NEVER "restore" or "fix" without user confirmation

**If user reports .env.local issues**: Ask what values are missing, provide template, let USER restore their own credentials.

## ⚠️ CRITICAL: Temporary Files

### `.tmp/` Directory - Use for All Temporary Files

**ABSOLUTE RULE**: All temporary files MUST be written to the `.tmp/` directory, which is gitignored.

**Why**:

- Prevents accidental commits of temporary/scratch files
- Keeps repository clean
- Avoids creating files like `nul`, `temp.txt`, etc. in tracked directories

**Correct Approach**:

1. ✅ Always write temp files to `.tmp/` directory: `.tmp/scratch.txt`
2. ✅ Create `.tmp/` directory if it doesn't exist
3. ✅ Use descriptive names: `.tmp/build-output.log`, `.tmp/test-data.json`
4. ✅ Clean up temp files when done (optional, as `.tmp/` is gitignored)

**Incorrect Approach**:

1. ❌ NEVER write temp files to project root (e.g., `./nul`, `./temp.txt`)
2. ❌ NEVER write temp files to tracked directories (e.g., `src/temp.js`)
3. ❌ NEVER use ambiguous filenames that might conflict with real files

**Examples**:

```bash
# Good
mkdir -p .tmp
echo "test" > .tmp/output.log

# Bad
echo "test" > nul
echo "test" > temp.txt
```

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

## Logging and Observability

### Seq (Structured Logging)

Seq is a structured logging tool for local development debugging. It provides a web UI to view, search, and analyze logs in real-time.

**Setup (Docker):**

```bash
docker run --name seq -d --restart unless-stopped -e ACCEPT_EULA=Y -e SEQ_FIRSTRUN_NOAUTHENTICATION=True -p 5341:80 datalust/seq:latest
```

**Access Seq UI:** http://localhost:5341

**Configuration (.env.local):**

```bash
ENABLE_SEQ_LOGGING="true"
SEQ_SERVER_URL="http://localhost:5341"
SEQ_API_KEY=""  # Optional
```

**Usage in Code:**

```typescript
import { logger } from "@/lib/logger";

logger.info("User logged in", { userId: "123" });
logger.error("Database connection failed", error, { connectionString: "..." });
```

**Benefits:**

- Structured logs with properties (searchable/filterable)
- Real-time log streaming
- Query language for complex log analysis
- Visual timeline and charts

**Note:** Seq logging is optional and only enabled when `ENABLE_SEQ_LOGGING=true`

## Development Tools

### Playwright MCP (Frontend Testing & Screenshots)

Playwright MCP enables automated browser testing and visual debugging during development.

**Configuration:**
This project includes a `.mcp.json` file with Playwright MCP configured as a **project-scoped server**. This means:

- All team members automatically get access to Playwright when using Claude Code
- Configuration is version controlled
- Claude Code will prompt for approval on first use
- No manual installation needed

**Available in Claude Code sessions for:**

- Automatic screenshot capture of localhost:3000
- Visual verification of styling changes
- Frontend debugging without manual screenshots
- Interactive testing of user flows

**Common commands:**

```typescript
// Take screenshot of specific route
"Use Playwright to navigate to localhost:3000/session/ABC123 and take a screenshot";

// Test user interactions
"Click the vote button and show me what happens";

// Verify styling
"Open the question list page and capture what the cards look like";
```

**Manual verification:**

```bash
# Check Playwright is available
claude mcp list

# Reset approval choices if needed
claude mcp reset-project-choices
```

**Resources:**

- [Playwright MCP Server](https://github.com/microsoft/playwright-mcp)
- [Using with Claude Code](https://til.simonwillison.net/claude-code/playwright-mcp-claude-code)
- [MCP Documentation](https://code.claude.com/docs/en/mcp)

### Database Schema

**Question Status Values:**

- `pending` - Question submitted, awaiting host approval
- `approved` - Question approved and visible to participants
- `dismissed` - Question dismissed by host (not visible)
- `answered` - Question marked as answered
- `being_answered` - Question currently being addressed

**Pulse Check Feedback:**

- Model: `PulseCheckFeedback` - Stores emoji feedback on answered questions
- Feedback types: `helpful` (💚), `neutral` (💛), `not_helpful` (🔴)
- Unique constraint on `[questionId, participantId]` prevents duplicate feedback per question
- Automatically deleted when question is deleted (cascade)

### Participant Identity Model

Participants are identified by client-generated UUIDs:

- **Generated**: Browser creates UUID v4 on first session join
- **Storage**: localStorage as `participant_{sessionCode}`
- **Persistence**: Survives page refreshes in same browser/device
- **Scope**: Different devices/browsers = different participants
- **Privacy**: Incognito mode = new participant

**Rationale**: Solves corporate proxy/NAT issues (multiple people behind same IP) while maintaining zero-friction UX.

**Implementation**:

- `src/lib/participant-id.ts` - Utility functions for participant ID management
- `src/types/participant.ts` - TypeScript types for participant identity
- Database fields: `participantId` (String) in Question, Vote, PulseCheckFeedback models

**Rate Limiting Strategy**:

- **Primary deduplication**: participantId (user experience - prevents duplicate votes/feedback)
- **Secondary rate limiting**: IP address (security - prevents abuse/spam)
- Dual-layer approach handles both good faith participants AND potential bad actors

**Privacy**: No server-side participant tracking, no registration required, truly anonymous.

## Testing Setup

- **Test Framework**: Jest with React Testing Library
- **Test Database**: SQLite (in-memory for isolation)
- **Test Configuration**: `.env.test` - Test environment variables
- **Test Database Schema**: `prisma/schema.test.prisma` - Separate test schema
- **Test Execution**: Serial (maxWorkers: 1) to avoid database contention

### Test Files

- `__tests__/integration/sessions.test.ts` - Session business logic integration tests
- `__tests__/integration/question-submission.test.ts` - Question submission business logic tests
- `__tests__/integration/host-questions.test.ts` - Host questions API integration tests
- `__tests__/integration/host-question-status.test.ts` - Question status update API integration tests
- `__tests__/utils/session-utils.test.ts` - Session utilities unit tests
- `__tests__/utils/rate-limit.test.ts` - Rate limiting business logic unit tests
- `__tests__/utils/request-utils.test.ts` - Request utility (IP extraction) unit tests
- `__tests__/integration/session-lifecycle.test.ts` - Complete session workflow tests
- `__tests__/setup/test-db.ts` - Test database utilities
- `jest.config.js` - Jest configuration with Next.js support
- `jest.setup.js` - Global test setup and database cleanup

## Key Files

### Project Management

- `projectmanagement/PRODUCT_SPEC.md` - Product requirements and features
- `projectmanagement/TECHNICAL_SPEC.md` - Technical architecture and implementation details
- `projectmanagement/feature_*.md` - User stories for specific features

### Database & Schema

- `prisma/schema.prisma` - Database schema and models (includes NextAuth tables)
- `prisma/schema.test.prisma` - Test database schema (SQLite)

### Authentication & Authorization

- `src/lib/auth.ts` - NextAuth.js configuration with Google OAuth
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth.js API routes
- `src/middleware.ts` - Route protection middleware
- `src/types/next-auth.d.ts` - NextAuth TypeScript type extensions

### Session Management

- `src/app/api/sessions/route.ts` - Session creation API endpoint (POST)
- `src/app/api/sessions/[code]/route.ts` - Session retrieval (GET) and update (PATCH) API endpoints
- `src/app/create/page.tsx` - Session creation page with form and authentication
- `src/app/session/[code]/host/page.tsx` - Host dashboard for session management
- `src/lib/session-utils.ts` - Session code generation and validation utilities
- `src/types/session.ts` - TypeScript types for session entities and API responses

### Question Management & Audience Participation

**Participant (Public) Components:**

- `src/app/session/[code]/page.tsx` - Participant session view (public, no auth required)
- `src/components/participant/QuestionSubmitForm.tsx` - Question submission form component
- `src/components/participant/QuestionList.tsx` - Question list with auto-refresh
- `src/components/participant/QuestionCard.tsx` - Individual question card with voting
- `src/components/participant/PulseCheck.tsx` - Pulse check emoji feedback component

**Host (Authenticated) Components:**

- `src/app/session/[code]/host/page.tsx` - Host dashboard with question management (requires auth)
- `src/components/host/HostQuestionList.tsx` - Host question list showing all questions sorted by votes with status update controls

**API Endpoints:**

- `src/app/api/sessions/[code]/questions/route.ts` - Question submission (POST) and retrieval (GET) for participants (approved questions only)
- `src/app/api/sessions/[code]/host/questions/route.ts` - Question retrieval (GET) for hosts (all questions, all statuses, requires auth)
- `src/app/api/questions/[id]/route.ts` - Question status update (PATCH) for hosts (being_answered, answered)
- `src/app/api/questions/[id]/vote/route.ts` - Voting endpoints (POST to vote, DELETE to unvote)
- `src/app/api/questions/[id]/pulse/route.ts` - Pulse check feedback endpoint (POST)

**Utilities & Types:**

- `src/lib/question-utils.ts` - Question validation and business logic
- `src/lib/participant-id.ts` - Participant UUID generation and validation
- `src/lib/rate-limit.ts` - In-memory rate limiting for API endpoints
- `src/lib/request-utils.ts` - Request utility functions (IP extraction)
- `src/types/question.ts` - TypeScript types for questions, votes, pulse checks, and host responses
- `src/types/participant.ts` - TypeScript types for participant identity

### Environment

- `.env` - Environment variables (not committed to git)
- `.env.example` - Environment variables template
