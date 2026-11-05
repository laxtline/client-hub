// Simple logger - use this instead of console.log everywhere
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, requestId, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
      const reqId = requestId ? ` [${requestId}]` : '';
      return `${timestamp} [${level.toUpperCase()}]${reqId} ${stack || message}${metaStr}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

if (process.env.NODE_ENV === 'production' && !process.env.VERCEL) {
  logger.add(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
}

export default logger;
