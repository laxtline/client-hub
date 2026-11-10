import { useEffect, useState } from 'react';
import { SocketContext } from './contexts.js';
import { useAuth } from '../hooks/useAuth.js';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!token || user?.role === 'demo' || user?.mustChangePassword) {
      setSocket(null);
      return undefined;
    }

    let active = true;
    let created = null;

    // Do not leave a connection open if logout happens during the import.
    import('socket.io-client')
      .then(({ io }) => {
        if (!active) return;
        created = io(SOCKET_URL, { auth: { token }, autoConnect: true });
        setSocket(created);
      })
      .catch(() => {
        // The bell can still load its list over HTTP.
        if (active) setSocket(null);
      });

    return () => {
      active = false;
      created?.disconnect();
    };
  }, [token, user?.role, user?.mustChangePassword]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}
