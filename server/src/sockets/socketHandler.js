import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';
import prisma from '../config/db.js';

let io = null;

export function initSockets(httpServer) {
  io = new Server(httpServer, {
    // Use the allowed frontend origins when cookies are enabled.
    cors: {
      origin: (process.env.CLIENT_URL || 'http://localhost:5173')
        .split(',')
        .map((origin) => origin.trim().replace(/\/$/, ''))
        .filter(Boolean),
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user || user.disabled || user.mustChangePassword || !['admin', 'team_member', 'client'].includes(user.role)
        || (user.role === 'team_member' && !user.createdByAdmin && !user.isDemo)
        || (decoded.version ?? 0) !== user.sessionVersion) throw new Error('Unauthorized');
      socket.userId = decoded.id;
      socket.tokenExpiresAt = decoded.exp * 1000;
      next();
    } catch {
      next(new Error('Unauthorized socket'));
    }
  });

  io.on('connection', (socket) => {
    // Each user gets a room for their own notifications.
    socket.join(socket.userId);
    const expiryTimer = setTimeout(() => socket.disconnect(true), Math.max(0, socket.tokenExpiresAt - Date.now()));
    socket.on('disconnect', () => clearTimeout(expiryTimer));
    logger.debug(`Socket connected for user ${socket.userId}`);
    socket.on('disconnect', () => logger.debug(`Socket disconnected ${socket.userId}`));
  });

  return io;
}

export function emitToUser(userId, event, payload) {
  if (io && userId) io.to(userId).emit(event, payload);
}

export function disconnectUser(userId) {
  io?.in(userId).disconnectSockets(true);
}

export function closeSockets() {
  if (io) {
    logger.info('Closing socket connections...');
    io.close();
    io = null;
  }
}
