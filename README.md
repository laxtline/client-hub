# ClientHub

I built ClientHub as a portfolio project to practise full-stack development. The idea is an agency portal where a team can track client work and clients can see their projects and invoices in one place.

This project uses JavaScript on both sides: React in the browser and Express on the server. The AI feature calls an LLM API; there is no model training or machine learning pipeline. I used AI assistance while building it, and I am using the project to learn the implementation and its trade-offs.

I am a fresher MCA graduate learning Python and full-stack development. For this project, I chose JavaScript so I could work on the frontend and backend together. My focus was connecting the screens to actual database records and understanding permissions, authentication and the invoice flow.

- [Live demo](https://clienthub-dusky.vercel.app)
- [API health](https://clienthub-api.vercel.app/api/health)
- [Source code](https://github.com/laxtline/client-hub)

The hosted version is a demo with synthetic client data. See the accounts below to try each role.

## What is working

- Admin, team member and client logins. Client accounts are linked to a client record, and the API checks that they only access their own projects and invoices.
- Client records, projects and a task board with comments, logged hours and progress calculated from completed tasks.
- Invoices with line items and tax, plus PDF downloads.
- A clearly labelled **demo payment** that saves the payment and paid invoice status in PostgreSQL. It does not move money and is disabled in production.
- Notifications and Socket.io updates for the client, admin and team after a payment.
- Project summaries through Groq when configured. Without it, the app saves a basic summary from task counts, hours and the deadline.

Socket.io updates and scheduled jobs need a persistent Node server. The current Vercel deployment serves the REST API; it does not run these background features.

The Razorpay order and signed-webhook code is on the backend. The current Pay Now button does **not** open Razorpay Checkout. SMTP and ImageKit are optional integrations too; their actual delivery/upload still needs separate verification.

## Stack

React 18, Vite, Tailwind CSS, React Router, Axios, Recharts and dnd-kit on the frontend. Express, Prisma and PostgreSQL on the backend. JWT access tokens stay in memory, with rotating refresh tokens in httpOnly cookies. Tests use Vitest and React Testing Library.

## Run locally

You need Node.js **24.x**, npm and PostgreSQL. Clone the repository, then open its folder:

```sh
git clone https://github.com/laxtline/client-hub.git
cd client-hub
```

Start with a dedicated development database. Don't overwrite an existing `.env` or run a forced seed against data you want to keep.

In `server`, copy `.env.example` to `.env` if it does not already exist. Set `DATABASE_URL` and a long random `JWT_SECRET`, then run:

```sh
cd server
npm ci
npm run prisma:push
npm run seed
npm run dev
```

`prisma:push` is for the development database. There is no committed migration history yet. The seed skips an existing database containing users; `FORCE_SEED=true` clears data and is not a normal startup step.

In another terminal, go to `client`. Copy `.env.example` to `.env` if needed, then run:

```sh
cd client
npm ci
npm run dev
```

The default frontend is `http://localhost:5173`. The API is `http://localhost:5000`, with routes under `/api`. `GET /api/health` returns `database: "ok"` when PostgreSQL is reachable. Set `CLIENT_URL` on the server to the frontend origin, `VITE_API_URL` to the API URL including `/api`, and `VITE_SOCKET_URL` to the API origin without `/api`.

## Demo accounts

These are public demo credentials for synthetic data. Passwords are case-sensitive.

| Account | Email | Password |
| --- | --- | --- |
| Admin | admin@clienthub.com | Admin@ClientHub.Passcode |
| Project Manager (team) | project.manager@clienthub.com | Project.Manager@ClientHub.Passcode |
| Invoice Manager (team) | invoice.manager@clienthub.com | Invoice.Manager@ClientHub.Passcode |
| Task Manager (team) | task.manager@clienthub.com | Task.Manager@ClientHub.Passcode |
| UI/UX Designer (team) | ui.ux.designer@clienthub.com | UI.UX.Designer@ClientHub.Passcode |
| Developer (team) | developer@clienthub.com | Developer@ClientHub.Passcode |
| Oscorp (client) | oscorp@clienthub.com | Oscorp@ClientHub.Passcode |
| Hooli (client) | hooli@clienthub.com | Hooli@ClientHub.Passcode |
| Umbrella (client) | umbrella@clienthub.com | Umbrella@ClientHub.Passcode |
| Skyline (client) | skyline@clienthub.com | Skyline@ClientHub.Passcode |
| ShopNest (client) | shopnest@clienthub.com | ShopNest@ClientHub.Passcode |
| SwiftMove (client) | swiftmove@clienthub.com | SwiftMove@ClientHub.Passcode |
| Foodie Hub (client) | foodie@clienthub.com | Foodie@ClientHub.Passcode |
| Tata Heavy Steel (client) | steel@clienthub.com | Steel@ClientHub.Passcode |
| Wonka (client) | wonka@clienthub.com | Wonka@ClientHub.Passcode |
| Cyberdyne (client) | cyberdyne@clienthub.com | Cyberdyne@ClientHub.Passcode |

The seed has 16 accounts. The manager/designer/developer names all use the same `team_member` role; they are not separate permission levels. Use separate browser profiles when comparing roles, because normal tabs share the refresh cookie.

## Finding the code

This is the source layout. Individual screen and component files are grouped under their folders; installed dependencies, build output and private local files are left out.

```text
client-hub/
├── client/
│   ├── src/
│   │   ├── api/                   # Axios client and API requests
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── dashboard/
│   │   │   ├── invoices/
│   │   │   ├── kanban/
│   │   │   ├── layout/
│   │   │   └── notifications/
│   │   ├── context/               # Auth, sockets, theme and toasts
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── test/                  # Shared test setup
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── .env.example
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vercel.json
│   └── vite.config.js
├── server/
│   ├── api/
│   │   └── index.js               # Vercel REST entry
│   ├── scripts/
│   │   └── verify-local.js
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── jobs/
│   │   ├── middleware/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.js
│   │   ├── routes/
│   │   ├── services/
│   │   ├── sockets/
│   │   ├── tests/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js              # Persistent server with sockets/jobs
│   ├── .env.example
│   ├── eslint.config.js
│   ├── package.json
│   ├── package-lock.json
│   └── vercel.json
├── .gitattributes
├── .gitignore
├── .prettierignore
├── .prettierrc.json
├── LICENSE
└── README.md
```

`client/src/pages` contains the screens. Shared UI is in `components`; request modules are in `api`; auth, sockets and theme state are in `context`.

On the server, `routes` validates requests and applies role middleware, `controllers` handles requests, and `services` contains payment, summary and notification logic. The database schema and seed are in `server/src/prisma`. `server/scripts/verify-local.js` checks the API against the local database using temporary records.

I kept the client and server separate because they run as separate processes. There is no Docker setup or active CI workflow in the current working tree. `server/api/index.js` is an optional REST-only serverless entry; it does not run sockets or scheduled jobs. The main runtime is `server/src/server.js`.

## How the main flows work

After login, the frontend keeps the short-lived access token in memory. The server stores a hashed refresh token and sends the browser an httpOnly refresh cookie. Passwords are hashed with bcrypt.

Requests pass through authentication and role checks before reaching a controller. For a client account, controller queries also check the linked client record, so hiding a page in the browser is not the only access check. Prisma reads and writes the PostgreSQL records.

For a development demo payment, the payment record and invoice status change are saved in one database transaction. Notifications are then saved for the relevant users. The PDF download is generated from invoice data on the server. Real gateway checkout still needs the browser integration described above.

## Checks

From `server`:

```sh
npm test
npm run lint
npm run verify:local
```

From `client`:

```sh
npm test
npm run lint
npm run build
```

The integration runner only accepts this project's `127.0.0.1:5433/clienthub` database and also needs the client dependencies installed. It creates temporary fixtures and removes them afterward. The latest local review passed 66 backend tests, 29 frontend tests and 17 database/HTTP/socket integration scenarios. Lint and the production build passed too. Provider delivery and a complete browser walkthrough were not part of those checks.

## What still needs work

- Public signup currently creates staff accounts with agency access. The hosted demo only contains synthetic data; registration needs an invitation or restricted onboarding policy before using private client data.
- Refresh requests are coordinated within one tab; independent tabs still need coordination.
- Real browser checkout, external SMTP/ImageKit/Groq delivery, and scheduled execution on a host need verification.
- Browser download behavior, mobile drag-and-drop and a few accessibility edge cases still need manual checks. Component/API tests do not replace those checks.
- A production database needs reviewed migrations and a deliberate money-storage strategy; the demo schema currently uses floating-point amounts with rounding at the payment boundary.

## Existing deployment setup

The frontend and REST API are deployed as separate Vercel projects, with PostgreSQL on Neon. Their root directories are `client` and `server`. The frontend builds with `npm run build`; the API uses `api/index.js`. Both have checked-in route configuration.

The current deployments were published through the Vercel CLI. Automatic deployment from GitHub is not configured; the Vercel Git integration still needs repository access. There is no active GitHub Actions pipeline.

Set frontend `VITE_API_URL` to the deployed API origin with `/api`, and `VITE_SOCKET_URL` to the API origin without `/api`. Keep `DATABASE_URL`, `JWT_SECRET` and optional provider credentials in the API project's environment settings, never in source control. Set `CLIENT_URL` to the actual frontend origin. Rebuild after changing frontend variables.

Vercel's serverless API entry does not run Socket.io or the in-process cron jobs. Those features run with `npm start` on a persistent Node server. Pay Now remains a development-only simulation and is intentionally blocked in production.

Use the existing cloud database configuration. Do not run schema changes or a forced seed automatically on deployment.

## Contact

Suryakanta Pradhan — MCA, full-stack development

[LinkedIn](https://www.linkedin.com/in/suryakanta-pradhan-b4179b27a/) · [Email](suryakant321pradhan@gmail.com)

MIT licensed. This is a learning and portfolio project.
