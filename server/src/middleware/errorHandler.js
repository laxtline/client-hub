import multer from 'multer';
import { Prisma } from '@prisma/client';
import logger from '../utils/logger.js';

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

const PRISMA_ERRORS = {
  P2034: { status: 409, message: 'The account changed during this request. Please try again.' },
  P2002: { status: 409, message: 'That value is already taken (must be unique).' },
  P2003: { status: 400, message: 'Related record not found.' },
  P2025: { status: 404, message: 'Record not found.' },
  P1000: { status: 503, message: 'Database connection failed.' },
  P1001: { status: 503, message: 'Database server unreachable.' },
  P1002: { status: 503, message: 'Database connection timeout.' },
  P1003: { status: 503, message: 'Database does not exist.' },
  P1008: { status: 503, message: 'Database query timeout.' },
  P1017: { status: 503, message: 'Database server closed connection.' },
};

function multerStatus(err) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return { status: 413, message: 'File is too large (max 2 MB).' };
  }
  return { status: 400, message: err.message || 'Upload failed.' };
}

export function errorHandler(err, req, res, _next) {
  let status = err.statusCode || 500;
  let message = err.message;
  const prismaCode = err.code || err.errorCode;

  if (err instanceof multer.MulterError) {
    ({ status, message } = multerStatus(err));
  } else if (err.message === 'Only image files are allowed') {
    status = 400;
  } else if (prismaCode && PRISMA_ERRORS[prismaCode]) {
    ({ status, message } = PRISMA_ERRORS[prismaCode]);
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    status = 503;
    message = 'Database connection failed. Check DATABASE_URL.';
  }

  logger.error(`${req.method} ${req.originalUrl} -> ${err.message}`);

  const isProd = process.env.NODE_ENV === 'production';
  res.status(status).json({
    message: status === 500 ? 'Something went wrong' : message,
    ...(isProd ? {} : { detail: err.message }),
  });
}
