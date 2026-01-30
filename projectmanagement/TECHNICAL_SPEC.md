# Q&A App Technical Specification

## Overview

A real-time Q&A application for events, meetings, and presentations. Users can create sessions, submit questions, vote on questions, and moderate discussions.

## Tech Stack

### Frontend

- **Next.js 14+** - React framework with App Router
- **React 18+** - UI library
- **Tailwind CSS** - Styling framework
- **TypeScript** - Type safety

### Backend

- **Next.js API Routes** - Server-side API
- **Prisma** - ORM for database operations
- **PostgreSQL** - Primary database (production)
- **SQLite** - Local development and test database
- **NextAuth.js** - Authentication handling

### Database Philosophy

- **SQLite-first development**: Local development and all testing use SQLite for speed and simplicity
- **PostgreSQL production**: Production deployments use PostgreSQL via Supabase
- **Database-agnostic business logic**: Core business logic remains compatible with both databases
- **PostgreSQL optimizations**: Production can use Postgres-specific features (indexes, JSONB, full-text search) for performance
- **CI/CD database reset**: Preview deployments automatically reset the entire database for clean testing

### Authentication

- **Google OAuth 2.0** - Single sign-on via NextAuth.js
- No guest access for session creation (hosts must authenticate)
- Anonymous participation for audience members

### Client State Management

- **SWR** (stale-while-revalidate) for data fetching, caching, and revalidation
- **Optimistic updates** for instant UI feedback (voting, question submission, status changes)
- **Smart polling** via SWR's `refreshInterval` for cross-user updates (10-second interval)
- **Automatic revalidation** on tab focus and network reconnect
- **Request deduplication** across components sharing the same data
- **Database-agnostic** architecture - no vendor lock-in to realtime providers

### Real-time Strategy

- **Polling-based updates** for cross-user changes (new questions, vote counts, status updates)
- **Optimistic UI updates** for same-user actions (immediate feedback without waiting for server)
- **No WebSockets/SSE** - keeps architecture simple and compatible with any backend
- **10-second refresh interval** provides near-real-time experience for audiences

## Database Schema

### Users Table

```sql
users:
- id: UUID (Primary Key)
- email: String (Unique)
- name: String
- image: String (Google profile picture)
- created_at: DateTime
- updated_at: DateTime
```

### Sessions Table

```sql
sessions:
- id: UUID (Primary Key)
- title: String
- description: String (Optional)
- code: String (Unique, 6-digit alphanumeric)
- host_id: UUID (Foreign Key -> users.id)
- is_active: Boolean (Default: true)
- is_accepting_questions: Boolean (Default: true)
- created_at: DateTime
- updated_at: DateTime
- expires_at: DateTime (Default: 24 hours from creation)
```

### Questions Table

```sql
questions:
- id: UUID (Primary Key)
- session_id: UUID (Foreign Key -> sessions.id)
- author_name: String (Optional, for anonymous questions)
- content: Text
- vote_count: Integer (Default: 0)
- status: Enum ('pending', 'approved', 'dismissed', 'answered', 'being_answered')
- is_anonymous: Boolean (Default: true)
- created_at: DateTime
- updated_at: DateTime
```

### Votes Table

```sql
votes:
- id: UUID (Primary Key)
- question_id: UUID (Foreign Key -> questions.id)
- voter_ip: String (IP address for anonymous voting)
- created_at: DateTime

UNIQUE(question_id, voter_ip) -- Prevent duplicate votes
```

## API Endpoints

### Authentication

- `GET /api/auth/signin` - Google OAuth login
- `GET /api/auth/signout` - Logout
- `GET /api/auth/session` - Get current user session

### Sessions

- `POST /api/sessions` - Create new Q&A session (authenticated)
- `GET /api/sessions/[code]` - Get session details by code
- `PUT /api/sessions/[id]` - Update session settings (host only)
- `DELETE /api/sessions/[id]` - End/delete session (host only)

### Questions

- `POST /api/sessions/[code]/questions` - Submit question (anonymous)
- `GET /api/sessions/[code]/questions` - Get all approved questions
- `PUT /api/questions/[id]/status` - Update question status (host only)
- `POST /api/questions/[id]/vote` - Vote on question (by IP)

### Real-time

- `GET /api/sessions/[code]/stream` - SSE endpoint for real-time updates

## Application Architecture

### Page Structure

```
/
├── page.tsx                    # Landing page
├── create/
│   └── page.tsx               # Create session (authenticated)
├── session/
│   └── [code]/
│       ├── page.tsx           # Join session (public)
│       └── host/
│           └── page.tsx       # Host dashboard (authenticated)
└── api/
    ├── auth/
    ├── sessions/
    └── questions/
```

### Component Structure

```
components/
├── ui/                        # Reusable UI components
├── forms/
│   ├── CreateSessionForm.tsx
│   ├── QuestionForm.tsx
│   └── LoginForm.tsx
├── questions/
│   ├── QuestionList.tsx
│   ├── QuestionItem.tsx
│   └── VoteButton.tsx
├── session/
│   ├── SessionInfo.tsx
│   ├── JoinSession.tsx
│   └── HostDashboard.tsx
└── layout/
    ├── Header.tsx
    └── Footer.tsx
```

## Key Features Implementation

### Session Creation Flow

1. User authenticates via Google OAuth
2. User fills out session creation form
3. System generates unique 6-digit code
4. Session persisted to database
5. User redirected to host dashboard

### Question Submission Flow

1. Anonymous user joins via session code
2. User submits question via form
3. Question saved with 'pending' status
4. Real-time update sent to host dashboard

### Voting System

1. Track votes by IP address to prevent duplicates
2. Update vote_count on questions table
3. Real-time updates to all participants

### Host Moderation

1. Host sees all questions regardless of status
2. Can approve/dismiss questions
3. Can mark questions as answered
4. Only approved questions visible to audience

## Security Considerations

### Rate Limiting

- Limit question submissions per IP (e.g., 5 per minute)
- Limit vote attempts per IP
- Session creation limits for authenticated users

### Data Validation

- Input sanitization for all form submissions
- XSS protection via React's built-in escaping
- SQL injection prevention via Prisma ORM

### Session Security

- Session codes expire after 24 hours
- Only hosts can modify session settings
- IP-based voting prevents duplicate votes

## Development Setup

### Environment Variables

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

### Database Setup

1. PostgreSQL database creation
2. Prisma schema migration
3. Database seeding (optional)

### Git Workflow

**Conventional Commits**: This project uses [Conventional Commits](https://www.conventionalcommits.org/) for all commit messages (format: `<type>: <description>`).

Common types: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `build:`, `ci:`

See `CLAUDE.md` for detailed examples and guidelines.

### Testing

- **Pragmatic approach**: Focus on business logic testing, rapid prototyping friendly
- **SQLite-based testing**: Fast, simple testing with real database operations
- **Business logic focus**: Test core functionality, skip framework edge cases
- **Jest + React Testing Library**: Primary testing framework with Next.js integration
- **Automatic database cleanup**: Tests run with fresh SQLite database for reliability
- **Simple setup**: No Docker complexity - `npm test` just works
- See [TESTING_STRATEGY.md](./TESTING_STRATEGY.md) for detailed philosophy

### Testing Commands

- `npm test` - Run all tests (primary command)
- `npm run test:watch` - Watch mode for development
- `npm run test:integration` - Run integration/business logic tests
- `npm run test:unit` - Run utility/business logic tests
- `npm run test:coverage` - Generate coverage report when needed

### Logging and Observability

**Seq (Structured Logging)** - Optional logging tool for local development debugging

**Purpose:**

- Investigate API errors with full context
- Search and filter logs by properties
- View real-time log streams
- Debug complex request flows

**Setup:**

```bash
# 1. Start Seq with Docker
docker run --name seq -d --restart unless-stopped -e ACCEPT_EULA=Y -e SEQ_FIRSTRUN_NOAUTHENTICATION=True -p 5341:80 datalust/seq:latest

# 2. Enable in .env.local
ENABLE_SEQ_LOGGING="true"
SEQ_SERVER_URL="http://localhost:5341"

# 3. Access UI
http://localhost:5341
```

**Usage in Code:**

```typescript
import { logger } from "@/lib/logger";

// Info logs
logger.info("Session created", { sessionCode: "ABC123", hostId: "user_123" });

// Error logs with context
logger.error("Database query failed", error, {
  query: "SELECT * FROM questions",
  sessionCode: "ABC123",
});

// Warning logs
logger.warn("Rate limit approaching", {
  ip: "1.2.3.4",
  current: 45,
  limit: 50,
});

// Debug logs (dev only)
logger.debug("Request parsed", { body, headers });
```

**Benefits:**

- **Structured properties**: Search by sessionCode, userId, endpoint, etc.
- **Query language**: `sessionCode = "ABC123" AND level = "Error"`
- **Visual timeline**: See request flows and timing
- **Export**: Download logs for analysis
- **No production impact**: Only enabled locally via environment variable

**Note:** Logs always go to console AND Seq (if enabled), so you get both outputs.

### Deployment

- **Vercel** recommended for Next.js deployment
- **PostgreSQL** via service like Neon, Supabase, or Railway
- Environment variables configured in deployment platform

## Future Enhancements (Post-MVP)

- AI question clustering and enhancement
- Google Drive/Gemini integration
- Question categories and filtering
- Export functionality
- Analytics and insights
- Mobile app support
