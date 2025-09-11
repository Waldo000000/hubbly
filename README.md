# Hubbly

Real-time Q&A platform for events, meetings, and presentations.

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

## Without Database

The app will run without a database connection but will show a red error status. All database operations will fail gracefully.

## Development Commands

- `npm run dev` - Start dev server
- `npm run build` - Build for production  
- `npx prisma studio` - View database
- `docker start hubbly-db` - Start database (if stopped)

## Project Structure

- `src/app/` - Next.js pages and API routes
- `prisma/` - Database schema and migrations
- `projectmanagement/` - Product specs and user stories