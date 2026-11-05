// Express app setup - middleware wiring + route mounting + error handling
// Kept separate from server.js so the app can be imported in tests without
// actually starting an HTTP listener
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import prisma from './config/db.js';

import { notFound, errorHandler } from './middleware/errorHandler.js';
import { handleWebhook } from './controllers/paymentController.js';
import { apiLimiter } from './middleware/rateLimiter.js';

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
// Helmet sets secure HTTP response headers
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS - allow frontend origin
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      callback(null, allowedOrigins.includes(origin.replace(/\/$/, '')));
    },
    credentials: true,
  })
);

// gzip responses
app.use(compression());

// request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// IMPORTANT: the payment webhook must read the RAW body to verify the signature,
// so it is mounted BEFORE express.json() with a raw parser.
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// JSON parsing for every other route
app.use(express.json({ limit: '1mb' }));

// Parse cookies so we can read the httpOnly refresh token cookie
app.use(cookieParser());

// General API rate limiting
app.use('/api', apiLimiter);

// ---- Health check ----
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
