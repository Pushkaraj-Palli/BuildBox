# BuildBox

BuildBox is an AI-assisted web application builder. Describe an application, and BuildBox uses Gemini to plan and generate its project files. Projects, generated files, conversations, and version snapshots are stored in PostgreSQL.

## Features

- Account registration and sign-in
- Create, rename, duplicate, and delete projects
- Generate Next.js application files from a prompt with Gemini
- Request changes to an existing generated project
- Review generation progress and diagnostic logs
- Browse project files in an editable, syntax-highlighted code editor
- Save and restore project versions
- Download a project as a ZIP archive
- Run production build checks inside a resource-limited Docker container
- Persist project files and history in PostgreSQL

The workspace Preview tab is currently a placeholder. Build checks run without network access in a restricted container and do not start a live preview.

## Tech stack

- Next.js 15 with the App Router
- React 18 and TypeScript
- PostgreSQL and Prisma 7
- Auth.js credentials authentication with bcrypt password hashing
- Google Gemini API for project planning, file generation, and updates
- Tailwind CSS, Framer Motion, and Lucide icons

## Requirements

- Node.js 20.19+, 22.12+, or 24+
- npm
- A running PostgreSQL database
- A Gemini API key for AI generation features
- Docker Engine (Docker Desktop using Linux containers on Windows; required only for isolated build checks)

## Local setup

1. Clone the repository and enter the project directory:

   ```bash
   git clone https://github.com/Pushkaraj-Palli/BuildBox.git
   cd BuildBox
   ```

2. Install dependencies:

   ```bash
   npm ci
   ```

3. Create a `.env` file in the project root:

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/buildbox?schema=public"
   AUTH_SECRET="replace-with-a-random-secret"
   GEMINI_API_KEY="your-gemini-api-key"
   GEMINI_MODEL="gemini-3.5-flash-lite"
   ```

   `DATABASE_URL` must point to a PostgreSQL database. `AUTH_SECRET` should be a long, random value. Keep `.env` private and do not commit API keys or other credentials. `GEMINI_MODEL` is optional; the application has a default model and fallback configuration.

4. Generate the Prisma client and apply the database migrations:

   ```bash
   npm run db:generate
   npm run db:migrate:dev
   ```

5. To enable isolated build checks, build the sandbox image while Docker Engine is running:

   ```bash
   npm run sandbox:build
   ```

6. Start the development server:

   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000), create an account, and sign in.

The seed command does not create sample users or projects:

```bash
npm run db:seed
```

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Generate the Prisma client and build the production application |
| `npm run start` | Start the production server after building |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:validate` | Validate the Prisma schema |
| `npm run db:migrate:dev` | Create or apply a development database migration |
| `npm run db:seed` | Run the seed script (no sample data is added by default) |
| `npm run sandbox:build` | Build the restricted Docker image used for generated-project build checks |

## Project structure

```text
app/                    Next.js pages and API routes
prisma/                 Prisma schema, migrations, and seed script
src/components/         Shared UI components, including the code editor
src/screens/             Screen-level client components
src/lib/server/          Database, AI, planning, generation, and validation logic
types/                   Shared TypeScript declarations
```

## Data storage

PostgreSQL stores user accounts, projects, generated project files, generation jobs and logs, AI usage records, conversations, messages, and project version snapshots. Generated file contents are stored in the `project_files` table; version snapshots are stored in `project_versions`.

## API health endpoints

- `GET /api/health` checks that the application process is responding.
- `GET /api/health/ready` checks readiness, including the database connection.

## Configuration and secrets

`DATABASE_URL`, `AUTH_SECRET`, and `GEMINI_API_KEY` are server-side values. Do not prefix them with `NEXT_PUBLIC_` or expose them in browser code. Keep your local `.env` file out of Git.
