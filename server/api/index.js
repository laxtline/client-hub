// Vercel serverless entry point.
// Vercel runs the API as on-demand functions rather than a long-lived process,
// so it cannot use src/server.js (which calls listen() and attaches Socket.io).
// It imports the bare Express app instead and lets the platform handle the
// HTTP layer. Consequence: Socket.io and node-cron are inactive on Vercel —
// notifications arrive on refresh and the weekly AI report is manual.
import app from '../src/app.js';

export default app;
