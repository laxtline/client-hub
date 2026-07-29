// SocketContext — opens a single Socket.io connection for the logged-in user and
// shares it with the app. The backend authenticates the socket with the same JWT
// used for REST, then pushes real-time events (e.g. "notification:new").
//
// PERFORMANCE: socket.io-client is imported dynamically. Statically importing it
// put ~42 kB in the entry bundle that signed-out visitors downloaded before the
// login form could paint, even though no socket is opened until they log in.
import { useEffect, useState } from 'react';
import { SocketContext } from './contexts.js';
import { useAuth } from '../hooks/useAuth.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // No token → no connection (e.g. on the login page).
    if (!token) {
      setSocket(null);
      return undefined;
    }

    let active = true;
    let created = null;

    // Load the client, then pass the JWT in the handshake so the server can
    // identify the user. `active` guards a logout that happens while the chunk
    // is still downloading — otherwise we'd leak an orphaned connection.
    import('socket.io-client')
      .then(({ io }) => {
        if (!active) return;
        created = io(SOCKET_URL, { auth: { token }, autoConnect: true });
        setSocket(created);
      })
      .catch(() => {
        // Real-time is an enhancement: the bell still loads over REST.
        if (active) setSocket(null);
      });

    // Clean up when the token changes or the provider unmounts.
    return () => {
      active = false;
      created?.disconnect();
    };
  }, [token]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}
