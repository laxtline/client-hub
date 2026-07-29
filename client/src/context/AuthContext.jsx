// AuthContext — single source of truth for "who is logged in".
// CONCEPT (React Context): shares state (the user + token) with the whole app
// without passing props down every level. We persist the JWT in localStorage so
// a page refresh keeps the user logged in.
import { useEffect, useMemo, useState, useCallback } from 'react';
import { AuthContext } from './contexts.js';
import { authApi } from '../api/authApi.js';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  // `loading` is true until we've checked any saved token, so guards don't flash.
  const [loading, setLoading] = useState(true);

  // On first load, if a token exists, restore the session by calling /auth/me.
  useEffect(() => {
    let active = true;
    async function restore() {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await authApi.me();
        if (active) setUser(data.user);
      } catch {
        // Token invalid/expired — clear it.
        localStorage.removeItem('token');
        if (active) setToken(null);
      } finally {
        if (active) setLoading(false);
      }
    }
    restore();
    return () => {
      active = false;
    };
    // We only want this to run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save the user + token after a successful login/signup.
  const login = useCallback((nextUser, nextToken) => {
    localStorage.setItem('token', nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  // Clear everything on logout.
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }, []);

  // Without useMemo the value object is new on every render, so every consumer
  // (navbar, sidebar, every page) re-rendered whenever anything above changed.
  const value = useMemo(
    () => ({ user, token, loading, login, logout }),
    [user, token, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
