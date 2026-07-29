// Global error handler — the LAST middleware in app.js.
// Any error thrown/forwarded in a route lands here, so we never leak stack
// traces to clients and always return a consistent JSON shape.
import multer from 'multer';
import logger from '../utils/logger.js';

// 404 handler for unmatched routes
export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Prisma signals expected, user-facing failures through error codes. Without
// this map they would all surface as an opaque 500 "Something went wrong" —
// e.g. re-using a client email would look like a server crash to the user.
const PRISMA_ERRORS = {
  P2002: { status: 409, message: 'That value is already taken (must be unique).' },
  P2003: { status: 400, message: 'Related record not found — check the linked item.' },
  P2025: { status: 404, message: 'Record not found.' },
};

// Multer rejects oversized/non-image uploads by throwing; those are bad
// requests, not server faults.
function multerStatus(err) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return { status: 413, message: 'File is too large (max 2 MB).' };
  }
  return { status: 400, message: err.message || 'Upload failed.' };
}

// Central error handler. Express recognises it by its 4 arguments.
export function errorHandler(err, req, res, _next) {
  let status = err.statusCode || 500;
  let message = err.message;

  if (err instanceof multer.MulterError) {
    ({ status, message } = multerStatus(err));
  } else if (err.message === 'Only image files are allowed') {
    // Thrown by our own multer fileFilter — a client mistake, not a crash.
    status = 400;
  } else if (err.code && PRISMA_ERRORS[err.code]) {
    ({ status, message } = PRISMA_ERRORS[err.code]);
  }

  logger.error(`${req.method} ${req.originalUrl} -> ${err.message}`);
  res.status(status).json({
    message: status === 500 ? 'Something went wrong on our end' : message,
    // Only expose details outside production
    ...(process.env.NODE_ENV !== 'production' && { detail: err.message }),
  });
}
