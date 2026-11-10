# ClientHub

I built ClientHub as my MCA final-semester project and placement portfolio. It brings client records, project tasks and invoices into one agency workspace, with separate access for administrators, team members and clients. Public visitors get an empty demo workspace with no agency data.

The project demonstrates a React interface, REST API integration, authentication, role-based access and persistent PostgreSQL data. It is intended for learning, interviews and demonstrations; further work is needed before using it for a real agency.

## Tech stack

| Area | Technologies |
| --- | --- |
| Frontend | React 18, JavaScript/JSX, Vite, Tailwind CSS, React Router |
| UI and API integration | Axios, Recharts, dnd-kit, Lucide React |
| Main backend | Node.js, Express, JWT, bcrypt |
| Database and ORM | PostgreSQL, Prisma |
| Notifications and invoices | Socket.io, PDFKit, node-cron |
| Optional summary service | Python, FastAPI, Uvicorn, Groq API |
| Verification tools | Playwright, pytest, local Node.js integration script |
| Local database | Docker Compose with PostgreSQL 16 |

The main API runs on Express. Python/FastAPI provides an optional project-summary service. Most application code uses JavaScript; TypeScript is used in selected configuration and browser-test files. Next.js is not used.

## Key features

- **Role-based workspace:** administrators manage records, team members see assigned projects/tasks, and clients view their linked projects and invoices. Access is checked on the API as well as in the interface; team accounts cannot open the client directory, agency financial dashboard or invoices.
- **Client and project management:** client profiles, linked portal accounts, project budgets, deadlines, status, archiving, search and pagination.
- **Task board:** drag-and-drop Kanban columns, priorities, comments and logged hours. Project progress is calculated from completed tasks.
- **Invoices:** line items, tax, calculated totals, payment status and downloadable PDF invoices.
- **Dashboards:** database-backed project, task and revenue summaries with charts.
- **Managed accounts:** administrators create team accounts and linked client logins, issue temporary passwords and reset forgotten passwords. The first login requires a new personal password before any workspace data is available. Password changes and resets end older sessions.
- **Public demo:** signup creates a restricted demo account. The login page also shows a shared demo login. Both open an empty workspace; password changes and resets are blocked for demo accounts.
- **Notifications:** stored user notifications and Socket.io updates when running the regular Node.js server.
- **Project summaries:** optional Groq-generated summaries through FastAPI, with a computed fallback when the service or key is unavailable.

**Payment scope:** the current payment interface simulates a payment locally and saves the result. It does not charge money, and simulation is blocked in production mode. Razorpay order and webhook code exists, but browser checkout is unfinished.

## Folder structure

```text
CLIENTHUB/
├── client/                    # React frontend
│   ├── src/
│   │   ├── api/               # API requests
│   │   ├── components/        # Shared UI and feature components
│   │   ├── context/           # Authentication, theme and socket state
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── routes/
│   │   └── utils/
│   └── tests/                 # Playwright browser tests
├── server/                    # Express API
│   ├── api/                   # Serverless HTTP entry
│   ├── scripts/               # Local integration verification
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── jobs/
│       ├── middleware/
│       ├── prisma/            # Database schema and demo seed
│       ├── routes/
│       ├── services/
│       ├── sockets/
│       └── utils/
├── python-services/
│   └── ai-service/            # Optional FastAPI summary service
├── docker-compose.yml
├── PROJECT_GUIDE.txt
├── README.md
└── LICENSE
```

## Setup and run locally

These commands use PowerShell. Install Node.js 22, Docker Desktop and Git. Python 3.12 is optional and is only needed for the FastAPI service. Open a terminal in the project root after downloading or cloning the repository.

### 1. Start PostgreSQL

Start Docker Desktop, then run:

```powershell
docker compose up -d postgres
```

The included local database uses port **5433**, database `clienthub`, user `clienthub` and password `clienthub`. These are local demo settings.

Use Compose for PostgreSQL only with the current setup. The full application Docker configuration still needs fixes; run the API and frontend using the steps below.

### 2. Configure environment files

Create local copies of the existing templates. These commands preserve any `.env` files you already have:

```powershell
if (!(Test-Path server/.env)) { Copy-Item server/.env.example server/.env }
if (!(Test-Path client/.env)) { Copy-Item client/.env.example client/.env }
```

Check these settings before starting:

| File | Key | Local value or requirement |
| --- | --- | --- |
| `server/.env` | `DATABASE_URL` | `postgresql://clienthub:clienthub@localhost:5433/clienthub?schema=public` |
| `server/.env` | `JWT_SECRET` | Replace the template value with a long random secret |
| `server/.env` | `PORT` | `5000` |
| `server/.env` | `NODE_ENV` | `development` |
| `server/.env` | `CLIENT_URL` | `http://localhost:5173` |
| `server/.env` | `AI_SERVICE_URL` | `http://localhost:8000` |
| `client/.env` | `VITE_API_URL` | `http://localhost:5000/api` |
| `client/.env` | `VITE_SOCKET_URL` | `http://localhost:5000` |

The server template also lists optional SMTP, Razorpay and ImageKit settings. Leave those integrations unconfigured if you do not need them for your local demonstration. Private `.env` files must stay out of Git; commit the example templates instead. `VITE_` values are public browser configuration and must never contain private keys.

### 3. Start the API

From the project root:

```powershell
cd server
npm ci
npm run prisma:push
npm run seed
npm run accounts:setup
npm run dev
```

`npm ci` also generates the Prisma client. For a fresh database, apply the schema and run the seed before `accounts:setup`. The seed creates the fictional agency records and also prepares account access. Running account setup first would create a demo user and cause the seed to skip the remaining sample records.

`accounts:setup` applies the schema and prepares the public demo login. It moves older public registrations that were given team access to the demo role, preserving business records and accounts created through the new admin flow. Existing fictional seed accounts retain their roles and have their passwords locked. Use these commands against the intended database and stop if they unexpectedly warn about data loss.

For an existing checkout, stop the API and run `npm ci` followed by `npm run accounts:setup` from `server` once before restarting. The seed skips business-data creation when users already exist; do not force a reseed to apply this update.

Check [API health](http://localhost:5000/api/health) and confirm the database is available.

### 4. Start the frontend

Open a second terminal in the project root:

```powershell
cd client
npm ci
npm run dev
```

Open [ClientHub locally](http://localhost:5173). Keep both terminals running.

### 5. Optional: start the Python summary service

In another terminal, starting from the project root:

```powershell
py -3.12 -m venv "$env:USERPROFILE\.venvs\clienthub-ai"
$aiPython = "$env:USERPROFILE\.venvs\clienthub-ai\Scripts\python.exe"
cd python-services/ai-service
& $aiPython -m pip install -r requirements.txt
if (!(Test-Path .env)) { Copy-Item .env.example .env }
& $aiPython -m uvicorn main:app --host 127.0.0.1 --port 8000 --env-file .env
```

For generated summaries, set `GROQ_API_KEY` in the service's `.env` before starting it. `GROQ_MODEL` defaults to `llama-3.3-70b-versatile`. Without a working key, the service returns a fallback summary. API documentation is available at [localhost:8000/docs](http://localhost:8000/docs).

To stop the application, press **Ctrl+C** in its terminals, then run `docker compose stop postgres` from the root. This keeps the database volume.

## Demo login credentials

### Quick demo / public account

After account setup, reviewers can use this login without choosing an agency role:

| Account | Email | Password |
| --- | --- | --- |
| Empty demo workspace | `demo@clienthub.example` | `Demo@ClientHub123` |

Public signup creates the same restricted type of account with the visitor's chosen credentials. Neither type can read agency data, change its password or use password recovery.

### Role-specific sample accounts

The following fictional accounts are defined in [the seed file](server/src/prisma/seed.js). Use them for a local role walkthrough, or on a hosted demonstration only when the matching sample data has been seeded. Unlike the restricted public demo account, they can access agency records according to their roles. Their password changes and resets are disabled.

These are shared sample credentials, not protection for private or real client data.

#### Administrator

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@clienthub.com` | `Admin@ClientHub.Passcode` |

#### Team members

| Title | Email | Password |
| --- | --- | --- |
| Project Manager | `project.manager@clienthub.com` | `Project.Manager@ClientHub.Passcode` |
| Invoice Manager | `invoice.manager@clienthub.com` | `Invoice.Manager@ClientHub.Passcode` |
| Task Manager | `task.manager@clienthub.com` | `Task.Manager@ClientHub.Passcode` |
| UI/UX Designer | `ui.ux.designer@clienthub.com` | `UI.UX.Designer@ClientHub.Passcode` |
| Developer | `developer@clienthub.com` | `Developer@ClientHub.Passcode` |

#### Clients

| Company | Email | Password |
| --- | --- | --- |
| Oscorp | `oscorp@clienthub.com` | `Oscorp@ClientHub.Passcode` |
| Hooli | `hooli@clienthub.com` | `Hooli@ClientHub.Passcode` |
| Umbrella | `umbrella@clienthub.com` | `Umbrella@ClientHub.Passcode` |
| Skyline | `skyline@clienthub.com` | `Skyline@ClientHub.Passcode` |
| ShopNest | `shopnest@clienthub.com` | `ShopNest@ClientHub.Passcode` |
| SwiftMove | `swiftmove@clienthub.com` | `SwiftMove@ClientHub.Passcode` |
| Foodie Hub | `foodie@clienthub.com` | `Foodie@ClientHub.Passcode` |
| Tata Heavy Steel | `steel@clienthub.com` | `Steel@ClientHub.Passcode` |
| Wonka | `wonka@clienthub.com` | `Wonka@ClientHub.Passcode` |
| Cyberdyne | `cyberdyne@clienthub.com` | `Cyberdyne@ClientHub.Passcode` |

Staff job titles share the `team_member` role and do not grant separate manager permissions. Team accounts see assigned work. Keep personal, database and hosting credentials private and out of Git.

## Team and client account flow

Everyone uses the same email/password login form. The saved account role decides which page opens; the user does not choose a role on the login screen.

| Account | Landing page | Available access |
| --- | --- | --- |
| Admin | Admin dashboard | Agency records, task assignment and team/client account management |
| Team member | Team Dashboard | Assigned projects and their own assigned tasks; no client directory, project budgets, agency revenue, invoices, payments or summaries |
| Client | Client dashboard | Linked-client projects, tasks, invoices, PDFs and summaries; comments on their own tasks |
| Public demo | Demo Workspace | Empty view with zero projects, tasks and invoices; no agency records |

These limits are enforced by the backend too. Changing a URL or sending a request outside the browser does not grant another role's access.

### Creating accounts and the first login

1. Admin opens **Team & Accounts** and enters the team member's name and email. For a client, admin uses **Clients** and supplies the required contact email; the client record and linked login are created together.
2. A generated temporary password appears once. Admin shares those details privately with the owner. Only the password hash is stored, and the temporary login is not saved in browser storage.
3. The owner signs in and sees **Set your new password**. They enter the temporary password and choose a different personal password with at least eight characters. Workspace pages and APIs remain blocked until this step is complete.
4. The user then reaches the dashboard for their role. Admin assigns tasks from the project form or task dialog. Team members can update permitted fields, status, hours and comments on their own tasks, but cannot create or reassign tasks. Removing an assignment removes that access.

The first-login rule applies to newly managed team/client accounts. Fictional seed accounts keep their documented shared passwords for role walkthroughs; their password changes and resets are locked.

### Forgotten passwords and account access

The login page shows this help message:

> Account banwane ya password reset karwane ke liye apne agency administrator se contact karein.

For a managed team/client account, admin uses **Reset password** in **Team & Accounts**. A new temporary password appears once, existing access/refresh sessions end, and the next login requires another personal password. Open sockets on the regular Node server are disconnected too. Admin cannot see the previous password.

A managed user who knows their password can use **Change password** in the navbar. Public demo and fictional seed accounts do not get that option. Old email-reset links lead to the administrator-contact page, and the public forgot/reset API returns `403`; SMTP is not needed for this recovery flow.

Admin can also disable or re-enable a team/client login without deleting project data. A disabled account cannot log in or keep using an existing session, and it must be enabled before its password can be reset.

## Live demo and screenshots

**Live demo:** `<LIVE_DEMO_URL>` — pending a verified deployment link.

Screenshots have not been added yet. Suggested views for reviewers:

| View | What it demonstrates |
| --- | --- |
| Admin dashboard | Project, task and revenue overview |
| Project task board | Kanban workflow, priorities and progress |
| Client portal | Client-specific project and invoice access |
| Invoice and PDF | Line items, totals and downloadable invoice |

For a public review, use the empty demo workspace. For a full workflow walkthrough in a local seeded setup, use the role-specific seed accounts, assign a task as admin, inspect the client portal and download an invoice PDF.

## Available checks

Run these from `client`:

```powershell
npm run build
npx playwright install chromium
npm test
```

Browser tests require the API, PostgreSQL and seeded accounts. The Playwright configuration starts or reuses the frontend development server.

The backend includes `node scripts/verify-local.js`, run from `server` against a local demo database. It creates temporary fixtures and checks API access, invoices, payments and related flows. `npm run test:accounts` checks demo isolation, first-login passwords, account creation, ownership, session revocation and administrator resets. It requires a seeded disposable local database named `clienthub_access_test_*`, supplied through `DATABASE_URL`; add `-- --browser` to include browser account-flow tests. Keep `JWT_SECRET` set and the test frontend port 5173 free.

The two browser tests that create accounts are enabled only by the disposable-database verifier. The login/access implementation was verified with a frontend build, Prisma validation, 10 account/access scenarios, 17 integration scenarios and six Chromium browser tests. Those checks used a separate temporary PostgreSQL database; they did not update the existing project database.

Python tests are in `python-services/ai-service/tests`; install `pytest` and `pytest-asyncio` in the Python environment and run `python -m pytest tests -q` from that service directory.

## Current limitations

- Payment checkout is incomplete, and optional external integrations need their own configuration and verification.
- Not every task change is broadcast to other browsers. The Vercel HTTP entry does not start sockets or scheduled jobs.
- Database migration history, decimal money storage, broader input validation and more complete user-flow tests remain to be added. The lint setup is also incomplete.

See [PROJECT_GUIDE.txt](PROJECT_GUIDE.txt) for additional implementation and setup notes.

## License

This project is available under the [MIT License](LICENSE).
