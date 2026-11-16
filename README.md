<div align="center">

# 📦 BuildBox

### Describe an app. Watch it get planned, built, validated and previewed.

An **AI-powered web application builder**: turn a plain-English prompt into a working Next.js project, check it in an isolated Docker sandbox, preview it live, then keep chatting to change it.

<br/>

[![CI](https://img.shields.io/github/actions/workflow/status/Pushkaraj-Palli/BuildBox/ci.yml?branch=main&style=for-the-badge&label=CI&logo=githubactions&logoColor=white)](https://github.com/Pushkaraj-Palli/BuildBox/actions/workflows/ci.yml)
[![Stars](https://img.shields.io/github/stars/Pushkaraj-Palli/BuildBox?style=for-the-badge&logo=github&color=f59e0b)](https://github.com/Pushkaraj-Palli/BuildBox/stargazers)

[![Next.js](https://img.shields.io/badge/Next.js_15-000000?style=flat-square&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React_18-20232A?style=flat-square&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Docker](https://img.shields.io/badge/Docker_Sandbox-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## ✨ What is BuildBox?

BuildBox is inspired by tools like **v0** and **Lovable**, but built to be **understandable, modular and safe**. It does not just paste AI output into a folder. Every request goes through a pipeline that plans, generates, validates, repairs and versions the result.

```text
"Create a task management SaaS with a dashboard, projects, due dates and dark mode"
                                      │
                                      ▼
   Plan  →  Generate files  →  Validate  →  Auto-repair  →  Live preview  →  Iterate
```

> **Why it's interesting:** AI-generated code is treated as **untrusted**. It is built and previewed inside a locked-down Docker container with no network, no privileges, and hard CPU, memory and time limits, never inside the BuildBox server process.

---

## 📸 Screenshots

<table>
  <tr>
    <td width="50%"><img src="https://github.com/user-attachments/assets/1335d816-466d-46e0-96c8-f920bcda373c" alt="BuildBox screenshot 1"/></td>
    <td width="50%"><img src="https://github.com/user-attachments/assets/9c67f0fc-03db-44c3-a010-c08324e84691" alt="BuildBox screenshot 2"/></td>
  </tr>
  <tr>
    <td width="50%"><img src="https://github.com/user-attachments/assets/063c5431-24ce-4c34-90db-08b1e73035d4" alt="BuildBox screenshot 3"/></td>
    <td width="50%"><img src="https://github.com/user-attachments/assets/8097f1ee-4a45-477c-851d-5fe65af70397" alt="BuildBox screenshot 4"/></td>
  </tr>
  <tr>
    <td width="50%"><img src="https://github.com/user-attachments/assets/f4fa15e6-7d8f-454c-b9ba-149a3cf93014" alt="BuildBox screenshot 5"/></td>
    <td width="50%"><img src="https://github.com/user-attachments/assets/309be108-5052-431e-8357-fdf6a68a2ffe" alt="BuildBox screenshot 6"/></td>
  </tr>
</table>

---

## 🧭 Table of Contents

- [Features](#-features)
- [How generation works](#-how-generation-works)
- [Safe by design](#-safe-by-design)
- [Tech stack](#-tech-stack)
- [Quick start](#-quick-start)
- [Architecture](#-architecture)
- [API overview](#-api-overview)
- [CI](#-continuous-integration)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)

---

## 🚀 Features

### 🤖 AI generation
- **Prompt → plan → project.** Gemini first writes an application plan, then generates the project files.
- **Structured output.** The AI must return schema-checked JSON, not free text that gets parsed by guesswork.
- **Fast iterations.** Ask for changes in plain English; BuildBox edits **only the relevant files** instead of regenerating everything.
- **Resilient provider.** Timeouts, a retry on transient errors, and an automatic **fallback model**.
- **Usage tracking.** Token counts per generation are stored for every AI call.

### ✅ Validate and repair automatically
- **Static checks** using the TypeScript compiler API: syntax errors, bad imports, wrong `Metadata` imports, invalid JSON.
- **Real production build** (`next build`) of every generated project inside the sandbox.
- **AI auto-repair:** if the build fails, the diagnostics go back to the model for a small, targeted fix, and the build runs again.
- **Dependency allow-list.** Generated projects can only use vetted packages.

### 🖥️ Builder workspace
- **Live preview** of the generated app, running in an isolated container
- **File explorer** and an **editable, syntax-highlighted code editor**
- **Build terminal** (read-only) showing build and validation output below the preview
- **Prompt history** and **generation progress** with stage-by-stage logs
- **Version history:** every significant change creates a snapshot you can **restore**
- **ZIP export:** download the project's source code

### 🗂️ Projects and accounts
- Registration and sign-in (credentials, `bcrypt`-hashed passwords, JWT sessions)
- Create, rename, **duplicate** and delete projects, each owned by and scoped to its user
- Everything is stored in PostgreSQL: files, versions, conversations, generation jobs and logs, AI usage

---

## 🔄 How generation works

<img width="4017" height="649" alt="mermaid-diagram-2026-11-16-161019" src="https://github.com/user-attachments/assets/31dda183-a209-41f4-9488-80597618fe1d" />

Each job moves through tracked states, `PENDING → PLANNING → GENERATING → VALIDATING → REPAIRING → COMPLETED / FAILED`, and every stage writes log entries you can read in the workspace. If a generation fails, the previous working project is left untouched.

**Generation limits** keep output sane: up to 35 files, 200 KB per file and 1 MB per project, with files generated in small batches.

---

## 🛡️ Safe by design

Generated code is never trusted. Builds and previews run in a container started with:

| Control | Setting |
|---|---|
| Network (build) | `--network none` (no internet at all) |
| Network (preview) | Dedicated bridge with **masquerading and inter-container traffic disabled**, published only on `127.0.0.1` |
| Filesystem | `--read-only` root, writable tmpfs only (256 MB workspace, 32 MB `/tmp`) |
| Privileges | `--cap-drop ALL`, `no-new-privileges`, **non-root user** (uid 10001) |
| Resources | **1 CPU, 768 MB RAM** (swap disabled), **128 processes**, 512 open files |
| Time | Build timeout **120 s**; previews auto-expire after **30 min** |
| Output | Build logs capped to prevent log flooding |
| Dependencies | Pre-installed in the image and installed with `--ignore-scripts`; AI can't add new ones |

And around the sandbox:

- 🔐 **Ownership enforced server-side** on every project, file, version and generation route
- 🧱 **Path validation** on generated files, rejecting `../`, absolute paths and unsafe names
- 🔑 **Secrets stay on the server.** The API key and DB credentials never reach the browser
- 🧾 **Safe errors.** Users get clear messages; details go to server logs only
- ✍️ **Prompt-injection hygiene.** Project files and build output are passed to the model as *data*, never as instructions

---

## 🧰 Tech stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 15 (App Router), React 18, TypeScript |
| **UI** | Tailwind CSS 4, Framer Motion, Lucide icons |
| **Auth** | Auth.js (NextAuth v5) credentials, bcrypt |
| **Database** | PostgreSQL 16 with Prisma 7 (`@prisma/adapter-pg`) |
| **AI** | Google Gemini behind a provider abstraction (`AIProvider`) |
| **Sandbox** | Docker (Node 22 Alpine image, non-root) |
| **CI** | GitHub Actions |

---

## ⚡ Quick start

### Prerequisites

- **Node.js** 20.19+, 22.12+ or 24+
- **PostgreSQL** (local or hosted)
- A **[Gemini API key](https://aistudio.google.com/apikey)**
- **Docker** (Docker Desktop with Linux containers on Windows) for build checks and live preview

### Setup

```bash
# 1. Clone and install
git clone https://github.com/Pushkaraj-Palli/BuildBox.git
cd BuildBox
npm ci
```

```bash
# 2. Create .env in the project root (never commit it)
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/buildbox?schema=public"
AUTH_SECRET="a-long-random-secret"
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-3.5-flash-lite"     # optional
```

```bash
# 3. Prepare the database
npm run db:generate
npm run db:migrate:dev

# 4. Build the sandbox image (Docker must be running)
npm run sandbox:build

# 5. Run
npm run dev
```

Open **http://localhost:3000**, create an account, and describe your first app. 🎉

> No Docker? Generation and editing still work. Only sandboxed build checks and live preview need it.

<details>
<summary><b>⚙️ Optional environment variables</b></summary>

| Variable | Purpose |
|---|---|
| `GEMINI_MODEL` | Primary Gemini model (a default is built in) |
| `GEMINI_FALLBACK_MODEL` | Model used if the primary one fails |
| `SANDBOX_DOCKER_IMAGE` | Override the sandbox image name (default `buildbox-sandbox:local`) |

</details>

<details>
<summary><b>📜 All npm scripts</b></summary>

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm run start` | Run the production build |
| `npm run typecheck` | TypeScript check with no emit |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:validate` | Validate the Prisma schema |
| `npm run db:migrate:dev` | Create or apply a development migration |
| `npm run db:migrate:deploy` | Apply migrations (production-safe) |
| `npm run db:seed` | Run the seed script (adds no sample data) |
| `npm run sandbox:build` | Build the restricted Docker sandbox image |

</details>

---

## 🏗️ Architecture

```text
BuildBox/
├── app/                         # Next.js routes
│   ├── api/
│   │   ├── auth/                # Auth.js + registration
│   │   ├── projects/[projectId]/  # plan, generate, iterate, files, versions,
│   │   │                          # validate, preview, export, generations
│   │   └── health/              # liveness + readiness (checks the DB)
│   └── dashboard/ workspace/ login/ signup/ ...
├── src/
│   ├── screens/ components/     # UI: workspace, editor, build terminal
│   └── lib/server/
│       ├── ai/                  # AIProvider interface + Gemini implementation
│       ├── planning/            # prompt → application plan
│       ├── generation/          # file generator, validation, repair, iteration,
│       │                        # templates, version snapshots
│       ├── sandbox/             # Docker build runner + live preview manager
│       └── export/              # ZIP export
├── prisma/                      # schema + migrations
├── sandbox/                     # Dockerfile for the isolated build image
└── .github/workflows/ci.yml
```

**Data model (PostgreSQL):** `users` · `projects` · `project_files` · `project_versions` · `conversations` · `messages` · `generation_jobs` · `generation_logs` · `usage_records` · `deployments`

**Design principles:** modular services (AI, DB, generation, validation and sandbox are independently replaceable), server-side validation everywhere, modify instead of regenerate, validate before trusting.

---

## 🔌 API overview

All project routes require authentication and verify ownership.

| Method | Route | Purpose |
|---|---|---|
| `GET` `POST` | `/api/projects` | List or create projects |
| `GET` `PATCH` `DELETE` | `/api/projects/:id` | Read, rename or delete a project |
| `POST` | `/api/projects/:id/duplicate` | Duplicate a project |
| `POST` | `/api/projects/:id/plan` | Create an application plan |
| `POST` | `/api/projects/:id/generate` | Start generation |
| `POST` | `/api/projects/:id/iterate` | Request a change to an existing project |
| `GET` | `/api/projects/:id/generations[/:genId]` | Generation history, progress and logs |
| `GET` | `/api/projects/:id/files` | List project files |
| `PATCH` | `/api/projects/:id/files/:fileId` | Save an edited file |
| `POST` | `/api/projects/:id/validate` | Build-check in the sandbox |
| `GET` `POST` `DELETE` | `/api/projects/:id/preview` | Check, start or stop the live preview |
| `GET` | `/api/projects/:id/versions` | Version history |
| `POST` | `/api/projects/:id/versions/:vid/restore` | Restore a version |
| `GET` | `/api/projects/:id/export` | Download the ZIP |
| `GET` | `/api/health`, `/api/health/ready` | Health checks |

---

## 🔁 Continuous integration

Every push and pull request to `main` runs GitHub Actions against a clean **PostgreSQL 16** service:

`npm ci` → **Prisma schema validation** → client generation → **type check** → **migrations on an empty database** → **production build**

---

## 🗺️ Roadmap

**Done**
- [x] Auth, persistent projects, PostgreSQL + Prisma
- [x] Planning and project generation with Gemini
- [x] Static validation, sandboxed build checks and AI auto-repair
- [x] Isolated live preview with a build terminal
- [x] Iterative edits, version history and restore, ZIP export
- [x] Prompt history, generation progress and logs
- [x] CI pipeline

**Next**
- [ ] Rate limiting and security headers
- [ ] Automated test suite (API, auth, generation, path validation)
- [ ] Working Templates, Settings and Pricing screens (UI exists, not yet wired to the backend)
- [ ] Production deployment on Render with a hardened sandbox worker
- [ ] More AI providers (OpenAI, Anthropic) via the existing abstraction

**Future**
- [ ] GitHub integration and one-click deploy
- [ ] Team collaboration and project sharing
- [ ] Usage limits and billing
- [ ] Database and API generation

---

## 🤝 Contributing

Contributions and ideas are welcome!

1. **Fork** the repo and create a branch: `git checkout -b feat/my-feature`
2. Run `npm run typecheck` and `npm run build` before committing
3. Use clear commit messages (`feat:`, `fix:`, `docs:`...)
4. Open a **Pull Request**

Found a bug or have a feature idea? [Open an issue](https://github.com/Pushkaraj-Palli/BuildBox/issues).

---

<div align="center">

### ⭐ If BuildBox caught your interest, please star the repo!

**[👁️ Watch](https://github.com/Pushkaraj-Palli/BuildBox/subscription)** to follow progress · **[🍴 Fork](https://github.com/Pushkaraj-Palli/BuildBox/fork)** to build on it

Built by [Pushkaraj Palli](https://github.com/Pushkaraj-Palli)

</div>
