// Socket.io setup + a helper to emit events to a specific user.
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger.js';

let io = null;

// Attach Socket.io to the HTTP server. Called once from server.js.
// Authenticates each socket with the same JWT used for REST.
export function initSockets(httpServer) {
  io = new Server(httpServer, {
    // Never '*': the browser rejects a wildcard origin when credentials are
    // enabled, which would silently kill every real-time connection in
    // production. Mirror the REST CORS default instead.
    cors: {
      origin: (process.env.CLIENT_URL || 'http://localhost:5173')
        .split(',')
        .map((origin) => origin.trim().replace(/\/$/, ''))
        .filter(Boolean),
      credentials: true,
    },
  });

  // Authenticate the socket connection using the token sent by the client.
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Unauthorized socket'));
    }
  });

  io.on('connection', (socket) => {
    // Put this socket in a room named after the user so we can target them.
    socket.join(socket.userId);
    logger.debug(`Socket connected for user ${socket.userId}`);
    socket.on('disconnect', () => logger.debug(`Socket disconnected ${socket.userId}`));
  });

  return io;
}

// Emit an event to one user's room. Safe no-op if sockets aren't initialised.
export function emitToUser(userId, event, payload) {
  if (io && userId) io.to(userId).emit(event, payload);
}

// Close all socket connections gracefully.
export function closeSockets() {
  if (io) {
    logger.info('Closing socket connections...');
    io.close();
    io = null;
  }
}
