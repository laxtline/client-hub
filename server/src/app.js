// Express app setup — middleware wiring + route mounting + error handling.
// Kept separate from server.js so the app can be imported in tests without
// actually starting an HTTP listener.
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import prisma from './config/db.js';

import { apiLimiter } from './middleware/rateLimiter.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { handleWebhook } from './controllers/paymentController.js';

// Route modules (one per resource)
import authRoutes from './routes/authRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

dotenv.config();

const app = express();

// Behind a reverse proxy (Render, nginx) the client IP arrives in
// X-Forwarded-For; without this, rate limiting would bucket everyone
// under the proxy's IP and stop protecting individual accounts.
app.set('trust proxy', 1);

// ---- Global middleware ----
// Helmet sets secure HTTP response headers (XSS, clickjacking, MIME-sniffing,
// etc.). We keep its defaults but relax cross-origin resource policy so the
// separate frontend origin can consume the API in development.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
// Never fall back to '*': with credentials enabled that would open the API to
// every origin if CLIENT_URL is unset. Default to the local dev frontend.
// CLIENT_URL accepts a comma-separated list so the production frontend and a
// preview/staging origin can both be allowed without redeploying the API.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);
app.use(
  cors({
    origin(origin, callback) {
      // No Origin header = same-origin or a non-browser client (curl, health
      // checks); nothing to enforce, so let it through.
      if (!origin) return callback(null, true);
      callback(null, allowedOrigins.includes(origin.replace(/\/$/, '')));
    },
    credentials: true,
  })
);
// gzip every JSON response. Analytics and project lists are the biggest
// payloads in the app and compress to roughly a fifth of their size, which is
// the single cheapest latency win on a free-tier host.
app.use(compression());
// Quiet request logging in production so the log file isn't one line per hit.
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// IMPORTANT: the payment webhook must read the RAW body to verify the signature,
// so it is mounted BEFORE express.json() with a raw parser.
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  handleWebhook
);

// JSON parsing for every other route. The cap stops an oversized body from
// being buffered into memory before any handler gets a chance to reject it.
app.use(express.json({ limit: '1mb' }));
app.use('/api', apiLimiter);

// ---- Health check ----
// Reports the DB too: a host's health probe should fail when the API is up but
// the database is unreachable, otherwise a broken deploy looks healthy.
app.get('/api/health', async (req, res) => {
  let database = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = 'unreachable';
  }
  res.status(database === 'ok' ? 200 : 503).json({
    status: database === 'ok' ? 'ok' : 'degraded',
    service: 'ClientHub API',
    database,
    uptimeSeconds: Math.round(process.uptime()),
  });
});

// ---- Mount feature routes ----
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);

// ---- 404 + global error handler (must be last) ----
app.use(notFound);
app.use(errorHandler);

export default app;
