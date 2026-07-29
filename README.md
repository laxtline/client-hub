# ClientHub — AI-Powered Agency Client & Project Management Portal

> Built by **Suryakanta Pradhan** (MCA, Full-Stack Web Development)

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Tests](https://img.shields.io/badge/tests-44%20passing-success)
![License](https://img.shields.io/badge/License-MIT-green)

ClientHub is a SaaS-style portal for a freelance agency/studio. It unifies **client &
project management**, a **multi-tenant role-based dashboard**, and **invoicing with
online payments** — plus an **AI weekly progress report** powered by the Groq API (Llama 3.3).

**🔗 Live demo:** _add your deployed URL here_ · **🎥 Demo video:** _add your video/GIF link here_

---

## 📸 Screenshots

| Login | Admin Dashboard |
|-------|-----------------|
| ![Login](docs/screenshots/login.png) | ![Admin Dashboard](docs/screenshots/admin-dashboard.png) |

| Kanban Board | Invoice + AI Report |
|--------------|---------------------|
| ![Kanban](docs/screenshots/kanban.png) | ![Invoice](docs/screenshots/invoice.png) |

> Screenshots live in `docs/screenshots/`. Replace the placeholders with your own
> captures (light **and** dark mode look great side by side).

---

## ✨ Key Features
- 🔐 **Auth & RBAC** — JWT + bcrypt, three roles (Admin / Team Member / Client)
- 🏢 **Tenant isolation** — a client cannot read another client's data even by calling the API directly
- 👥 **Clients** — CRUD, logo upload (ImageKit), debounced search & filter
- 📁 **Projects** — budget, timeline, auto-calculated progress %
- 🗂️ **Kanban tasks** — drag & drop (@dnd-kit), comments, time tracking, activity log
- ✅ **My Tasks** — every task assigned to you across all projects, soonest deadline first
- 🧾 **Invoicing & payments** — PDF export, Razorpay test mode, webhook-verified status
- 🔔 **Real-time notifications** — Socket.io + email fallback
- 📊 **Analytics** — Recharts dashboards with KPI tiles for admin & client
- 🤖 **AI progress summary** — Groq API weekly report + risk flag, with graceful fallback
- 🌙 **Dark mode** — system-aware, flash-free (applied before first paint), persisted
- 📱 **Responsive** — collapsible drawer navigation on phones and tablets
- 🔔 **Toast notifications** — instant success/error feedback on every action
- 🛡️ **Security** — Helmet headers, rate limiting, Zod validation, HMAC webhook verification
- ⚡ **Performance** — route-level code splitting, gzip, and a ~233 kB initial bundle

## 🛠️ Tech Stack
**Frontend:** React, Tailwind CSS, Recharts, @dnd-kit, Axios, React Router
**Backend:** Node.js, Express, Prisma, PostgreSQL, Socket.io, JWT, bcrypt, Helmet
**Integrations:** Groq API (Llama 3.3), Razorpay, ImageKit, Nodemailer, node-cron

## 🏗️ Architecture

```
          ┌────────────┐        HTTPS / WebSocket        ┌──────────────┐
          │  React SPA │  ───────────────────────────▶   │  Express API │
          │  (Vite)    │  ◀───────────────────────────   │  + Socket.io │
          └────────────┘         JSON / events           └──────┬───────┘
                                                                 │ Prisma
                                     ┌───────────────────────────┼───────────────────────┐
                                     ▼               ▼           ▼           ▼            ▼
                               ┌──────────┐    ┌─────────┐  ┌────────┐  ┌──────────┐  ┌──────┐
                               │PostgreSQL│    │ Groq AI │  │Razorpay│  │ ImageKit │  │ SMTP │
                               │ (Prisma) │    │  (LLM)  │  │  (pay) │  │ (logos)  │  │(mail)│
                               └──────────┘    └─────────┘  └────────┘  └──────────┘  └──────┘
```

Every external service is **optional**: if its key is absent the feature degrades
gracefully (the AI falls back to a deterministic template, payments return a clear
503, uploads and email no-op) instead of crashing the app.

## 📂 Folder Structure
```
clienthub/
├── client/   # React frontend (Vite)
├── server/   # Node/Express backend
└── docs/     # Project report, presentation, Postman collection, guides, screenshots
```
See `docs/` and the project report for the full file-by-file breakdown.

## 🚀 Quick Start

### Option A — Docker (one command)
Spins up PostgreSQL + API + frontend together. Needs Docker Desktop.
```bash
docker compose up --build
# Frontend → http://localhost:5173 · API → http://localhost:5000
```
Set secrets (`JWT_SECRET`, `GROQ_API_KEY`, etc.) in a `.env` next to
`docker-compose.yml`, or use the safe demo defaults. The backend builds the DB
schema (`prisma db push`) and seeds demo data automatically on first boot.

### Option B — Local dev
```bash
# Backend
cd server
cp .env.example .env        # fill in DATABASE_URL + JWT_SECRET at minimum
npm install                 # postinstall runs `prisma generate` for you
npx prisma db push          # create the schema (no migration files needed)
npm run seed                # demo data + demo accounts
npm run dev

# Frontend (new terminal)
cd client
cp .env.example .env        # set VITE_API_URL
npm install
npm run dev
```

Full step-by-step instructions, commands and troubleshooting: **`docs/run.txt`**.

## 🧪 Quality & Tooling
| Command | What it does |
|---------|--------------|
| `npm test` | Run the unit/component test suite (Vitest) — 29 server + 15 client |
| `npm run lint` | Lint with ESLint (flat config) — zero warnings on both apps |
| `npm run format` | Auto-format with Prettier |
| `npm run build` *(client)* | Production build with route-level code splitting |

**CI:** every push/PR to `main` runs lint + tests + build for both apps via
GitHub Actions (`.github/workflows/ci.yml`).

**Health check:** `GET /api/health` reports API status, database reachability and
uptime — it returns `503` if the DB is unreachable, so a broken deploy never
looks healthy to a host's probe.

## 🔑 Demo Credentials
All demo accounts share the password **`Demo@1234`**. They are deliberately kept
out of the login UI; the full list lives in `DEMO_LOGINS.txt`, which is stored
**outside** the repository so it is never committed.

| Role | Email |
|------|-------|
| Admin | admin@demo.com |
| Team Member | team@demo.com · priya@demo.com · arjun@demo.com · sana@demo.com |
| Client | client@demo.com · globex@demo.com · initech@demo.com · stark@demo.com |

## 📦 Deployment
Frontend → Vercel · Backend → Render · Database → Neon (all free tiers, no credit card).
Follow **`docs/best free way to live this project for free.txt`** top-to-bottom — ~20–30 minutes.

## 📚 Documentation
| File | What it covers |
|------|----------------|
| `docs/run.txt` | How to run it (Docker + local), every command, troubleshooting |
| `docs/imp-file.txt` | Every file & folder, and which ones deployment depends on |
| `docs/WEBSITE_GUIDE.txt` | Page-by-page walkthrough and a 3-minute demo flow |
| `docs/best free way to live this project for free.txt` | Full free deployment guide |
| `docs/github.txt` | Pushing to GitHub, branches, releases, repo presentation |
| `docs/resume.txt` | Resume bullets + interview talking points |
| `docs/prompt.txt` | The project specification the build followed |
| `docs/script_talk.txt` | Viva / presentation script |
| `docs/ClientHub_Project_Report.docx` | Formal MCA project report |
| `docs/ClientHub_Presentation.pptx` | Presentation slides |
| `docs/ClientHub.postman_collection.json` | Importable API collection |

## 📄 License
MIT © Suryakanta Pradhan
