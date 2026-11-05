import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import { initSockets, closeSockets } from './sockets/socketHandler.js';
import { startCronJobs, stopCronJobs } from './jobs/cronJobs.js';
import { validateEnv } from './config/validateEnv.js';
import prisma from './config/db.js';
import logger from './utils/logger.js';

dotenv.config();

validateEnv();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSockets(server);
startCronJobs();

server.listen(PORT, () => {
  logger.info(`ClientHub API running on http://localhost:${PORT}`);
});

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
  logger.info(`${signal} received - shutting down gracefully`);

  // Close socket connections gracefully
  closeSockets();
  // Stop cron jobs
  stopCronJobs();

  server.close(async () => {
    await prisma.$disconnect().catch(() => {});
    process.exit(exitCode);
  });
  setTimeout(() => process.exit(exitCode), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
