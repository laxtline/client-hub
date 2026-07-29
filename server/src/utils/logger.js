// Centralised Winston logger — use this instead of console.log everywhere.
// Gives structured, timestamped logs to the console (and a file in production).
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(
      ({ timestamp, level, message, stack }) =>
        `${timestamp} [${level.toUpperCase()}] ${stack || message}`
    )
  ),
  transports: [new winston.transports.Console()],
});

// In production, also persist errors to a file for later inspection.
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
}

export default logger;
