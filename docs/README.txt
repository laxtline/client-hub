===============================================================================
 ClientHub — AI-Powered Agency Client & Project Management Portal
 Built by Suryakanta Pradhan (MCA, Full-Stack Web Development)
===============================================================================
This is a plain-text overview. For the formatted version see README.md in the
repository root.

WHAT IT IS
-----------
ClientHub is a SaaS-style portal for a freelance agency/studio. It unifies
client & project management, a multi-tenant role-based dashboard, and invoicing
with online payments — plus an AI weekly progress report powered by the Groq
API (Llama 3.3).

The problem it solves: a small agency normally juggles a spreadsheet for
clients, a Trello board for tasks, Word documents for invoices, and email for
updates. ClientHub puts all four in one place and gives each client their own
read-only portal, so nobody has to ask "what's the status?" again.

KEY FEATURES
------------
- Auth & RBAC      : JWT + bcrypt, three roles (Admin / Team Member / Client).
- Tenant isolation : a client cannot read another client's data even by calling
                     the API directly — enforced server-side, not just in the UI.
- Clients          : CRUD, logo upload (ImageKit), debounced search & filter.
- Projects         : budget, timeline, auto-calculated progress %.
- Kanban tasks     : drag & drop (@dnd-kit), comments, time tracking, audit log.
- Invoicing        : PDF export, line items + tax, statuses, overdue automation.
- Payments         : Razorpay test mode, webhook signature verified server-side.
- Notifications    : real-time (Socket.io) + email fallback (Nodemailer).
- Analytics        : Recharts dashboards for admin & client.
- AI summary       : Groq API weekly report + risk flag, graceful fallback.
- Dark mode        : system-aware, persisted, and applied before first paint
                     (no white flash on load).
- Responsive       : drawer navigation on phones; full sidebar from tablet up.

TECH STACK
----------
Frontend : React 18, Vite, Tailwind CSS, Recharts, @dnd-kit, Axios, React Router.
Backend  : Node.js 20, Express, Prisma, PostgreSQL, Socket.io, JWT, bcrypt, Zod.
Services : Groq API, Razorpay, ImageKit, Nodemailer, node-cron, pdfkit.
Quality  : ESLint + Prettier, Vitest (44 tests), GitHub Actions CI, Docker Compose.

EVERY INTEGRATION IS OPTIONAL
-----------------------------
The app boots and works with only DATABASE_URL and JWT_SECRET set. Without the
other keys:
  - no GROQ_API_KEY  -> AI summary falls back to a deterministic template
  - no RAZORPAY_*    -> "Pay Now" returns a clear 503, nothing crashes
  - no IMAGEKIT_*    -> logo upload returns 503, everything else works
  - no SMTP_*        -> emails are logged and skipped
This "graceful degradation" is deliberate, and it is a good thing to point out
in an interview or viva.

FOLDER STRUCTURE
----------------
  clienthub/
  |- client/                 React frontend (Vite)
  |     |- src/api/          one file per resource, wraps Axios
  |     |- src/components/   common, layout, dashboard, kanban, invoices, notifications
  |     |- src/context/      auth, socket, theme, toast providers
  |     |- src/hooks/        useAuth, useFetch, useDebounce, useSocket, useTheme, useToast
  |     |- src/pages/        one file per route
  |     |- src/utils/        pure helpers (currency, dates, role guards)
  |- server/                 Node/Express backend
  |     |- src/config/       db, groq, imagekit, multer, razorpay, env validation
  |     |- src/controllers/  request/response only
  |     |- src/services/     business logic (AI, invoices, payments, email, notify)
  |     |- src/middleware/   auth, RBAC, validation, rate limit, error handler
  |     |- src/routes/       one router per resource, with Zod schemas
  |     |- src/prisma/       schema.prisma + seed.js
  |     |- src/tests/        Vitest unit tests
  |- docs/                   this folder — report, slides, guides, Postman collection
  |- docker-compose.yml      one-command stack (Postgres + API + frontend)
  |- .github/workflows/ci.yml   lint + test + build on every push/PR

QUICK START (see run.txt for full details)
-------------------------------------------
Docker (one command, from the folder containing docker-compose.yml):
  docker compose up --build      ->  http://localhost:5173

Local dev (two terminals):
  cd server && cp .env.example .env && npm install && npx prisma db push \
    && npm run seed && npm run dev
  cd client && cp .env.example .env && npm install && npm run dev

DEMO CREDENTIALS
----------------
All demo accounts use the password  Demo@1234
  Admin        admin@demo.com
  Team Member  team@demo.com   (also priya@, arjun@, sana@)
  Client       client@demo.com (also globex@, initech@, stark@)

These are NOT printed on the login page — that keeps the demo looking like a
real product. The full list lives in DEMO_LOGINS.txt, deliberately stored
outside the git repository so it is never committed.

DEPLOYMENT
----------
Frontend -> Vercel | Backend -> Render | Database -> Neon. All free tiers, no
credit card. Step-by-step guide:
  "best free way to live this project for free.txt"

WHICH FILE DO I READ?
---------------------
  What's left to do?          -> MUST_DO.txt          (start here)
  Want to run it?             -> run.txt
  Want to use the website?    -> WEBSITE_GUIDE.txt
  Putting it on GitHub?       -> github.txt
  Putting it on a resume?     -> resume.txt
  Deploying it for free?      -> best free way to live this project for free.txt
  Which files does deploy need? -> imp-file.txt
  Preparing for an interview? -> Interview.txt
  Preparing for the viva?     -> script_talk.txt
  Understanding the design?   -> prompt.txt
  Formal report / slides?     -> ClientHub_Project_Report.docx / _Presentation.pptx
  Testing the API?            -> ClientHub.postman_collection.json
  Quick overview?             -> this file / README.md

LICENSE
-------
MIT (c) Suryakanta Pradhan
===============================================================================
