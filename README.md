# Hubbly

Real-time Q&A platform for events, meetings, and presentations.

## Features

### Pulse Check Feedback

Participants can provide feedback on answered questions with a compact, accessible pulse check interface:

![Pulse Check Overview](https://github.com/user-attachments/assets/1a961b66-f86b-4099-819f-3813c574c38d)

**Key Features:**
- **Compact Design**: Buttons reduced from 56px to ~36px height (35% smaller)
- **Subtle Appearance**: Smaller emojis (16px) and tighter spacing for less visual dominance
- **WCAG Compliant**: Maintains 12px minimum text size for accessibility
- **Consistent Layout**: Card height remains stable whether showing buttons or confirmation
- **Three Options**: Helpful (💚), Neutral (💛), Not helpful (🔴)

![Pulse Check Detail](https://github.com/user-attachments/assets/9120b4b5-b7e7-4e50-b9a6-6f933d99f5b8)

## Quick Start

1. **Clone and install:**

   ```bash
   git clone <repo-url>
   cd hubbly
   npm install
   ```

2. **Start database:**

   ```bash
   docker run --name hubbly-db -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
   ```

3. **Set up environment:**

   ```bash
   cp .env.example .env
   # The .env file is automatically configured for the Docker setup above
   # DATABASE_URL="postgresql://postgres:password@localhost:5432/postgres"
   ```

4. **Initialize database:**

   ```bash
   npx prisma migrate dev --name init
   ```

5. **Start development:**
   ```bash
   npm run dev
   ```

Visit `http://localhost:3000` - you should see a green "Database connected and initialized with demo data" status with a demo user displayed.

## Optional: Seq Logging (Debugging)

Seq provides a web UI to view, search, and analyze logs in real-time. Helpful for debugging API errors.

1. **Start Seq:**

   ```bash
   docker run --name seq -d --restart unless-stopped -e ACCEPT_EULA=Y -e SEQ_FIRSTRUN_NOAUTHENTICATION=True -p 5341:80 datalust/seq:latest
   ```

2. **Enable in `.env.local`:**

   ```bash
   ENABLE_SEQ_LOGGING="true"
   ```

3. **Access Seq UI:** http://localhost:5341

Logs will appear in both console and Seq. See [TECHNICAL_SPEC.md](./projectmanagement/TECHNICAL_SPEC.md#logging-and-observability) for usage examples.

## Optional: Playwright MCP (Frontend Development)

Playwright MCP enables AI-assisted frontend debugging with automatic screenshots and browser interaction.

**This project includes `.mcp.json`** - Playwright MCP is configured as a project-scoped server. When you use Claude Code in this project, it will automatically detect and offer to enable the Playwright MCP.

**Manual installation (if needed):**
```bash
# The .mcp.json file configures this automatically
# but you can verify with:
claude mcp list
```

**What it enables:**
- Automatic screenshot capture during development
- AI can navigate and test your app autonomously
- No manual screenshot sharing needed
- Verify visual styling and layouts automatically

**Usage in Claude Code:**
- "Use Playwright to open localhost:3000 and show me the session page"
- "Take a screenshot of the question list"
- "Navigate to the host dashboard and capture the UI"

**Note:** Claude Code will prompt for approval the first time you use the project-scoped MCP.

See [Microsoft Playwright MCP](https://github.com/microsoft/playwright-mcp) for details.

## Without Database

The app will run without a database connection but will show a red error status. All database operations will fail gracefully.

## Development Commands

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npx prisma studio` - View database
- `docker start hubbly-db` - Start database (if stopped)
- `docker start seq` - Start Seq (if stopped)

## Project Structure

- `src/app/` - Next.js pages and API routes
- `prisma/` - Database schema and migrations
- `projectmanagement/` - Product specs and user stories
