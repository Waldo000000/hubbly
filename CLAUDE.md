# Claude Commands and Project Setup

## Available Commands

### `/implement-feature`
Creates user stories from a high-level feature description. Breaks down features into implementable tasks with proper ordering and dependencies.

Usage: `/implement-feature "Session creation"`

### `/implement-story`
Implements a single user story from a stories file. Automatically finds the first incomplete story and implements it.

Usage: `/implement-story feature_session_creation.md`

## Project Structure

- **Frontend**: Next.js 14+ with React 18+ and TypeScript
- **Backend**: Next.js API Routes with Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js with Google OAuth
- **Styling**: Tailwind CSS (to be added)

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm start` - Start production server

## Key Files

- `PRODUCT_SPEC.md` - Product requirements and features
- `TECHNICAL_SPEC.md` - Technical architecture and implementation details
- `feature_*.md` - User stories for specific features