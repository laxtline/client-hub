import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import { initSockets, closeSockets } from './sockets/socketHandler.js';
import { startCronJobs, stopCronJobs } from './jobs/cronJobs.js';
import { validateEnv } from './config/validateEnv.js';
import prisma from './config/db.js';

dotenv.config();

validateEnv();

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
initSockets(server);
startCronJobs();

server.listen(PORT, () => {
  console.log(`ClientHub API running on http://localhost:${PORT}`);
});

process.on('unhandledRejection', (reason) => {
  console.error(`Unhandled promise rejection: ${reason?.message || reason}`);
});
process.on('uncaughtException', (err) => {
  console.error(`Uncaught exception: ${err.message}`);
  shutdown('uncaughtException', 1);
});

let shuttingDown = false;
function shutdown(signal, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received - shutting down gracefully`);

  closeSockets();
  stopCronJobs();

  server.close(async () => {
    await prisma.$disconnect().catch(() => {});
    process.exit(exitCode);
  });
  setTimeout(() => process.exit(exitCode), 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));