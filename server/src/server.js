// Entry point — starts the HTTP server, attaches Socket.io, and schedules cron.
import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import { initSockets } from './sockets/socketHandler.js';
import { startCronJobs } from './jobs/cronJobs.js';
import { validateEnv } from './config/validateEnv.js';
import prisma from './config/db.js';
import logger from './utils/logger.js';

dotenv.config();

// Abort early with a clear message if the environment is misconfigured.
validateEnv();

const PORT = process.env.PORT || 5000;

// Wrap the Express app in a raw HTTP server so Socket.io can share the port.
const server = http.createServer(app);
initSockets(server);   // real-time notifications
startCronJobs();       // weekly AI summary job

server.listen(PORT, () => {
  logger.info(`ClientHub API running on http://localhost:${PORT}`);
});

// A crash that leaves the process running serves broken requests forever, and
// a container SIGTERM that kills it mid-request drops that request. Log the
// former loudly; drain connections and close the DB pool on the latter.
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled promise rejection: ${reason?.message || reason}`);
});
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.message}`);
  shutdown('uncaughtException', 1);
});

let shuttingDown = false;
function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received — shutting down gracefully`);
  server.close(async () => {
    await prisma.$disconnect().catch(() => {});
    process.exit(exitCode);
  });
  // Don't hang forever if a socket refuses to close.
  setTimeout(() => process.exit(exitCode), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
