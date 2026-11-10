import { useEffect, useMemo, useState, useCallback } from 'react';
import { AuthContext } from './contexts.js';
import { authApi } from '../api/authApi.js';
import { setAccessToken, refreshSession } from '../api/axiosClient.js';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const session = await refreshSession();
        if (active) {
          setUser(session.user);
          setToken(session.accessToken);
        }
      } catch {
        // No saved session is fine.
      } finally {
        if (active) setLoading(false);
      }
    }
    restore();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleRefresh(e) {
      setUser(e.detail.user);
      setToken(e.detail.accessToken);
    }
    window.addEventListener('auth:refresh', handleRefresh);
    return () => window.removeEventListener('auth:refresh', handleRefresh);
  }, []);

  const login = useCallback((nextUser, nextToken) => {
    setAccessToken(nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (err) {
      // Still clear this tab if the logout request fails.
      console.warn('Logout API failed, clearing local state anyway:', err);
    } finally {
      setAccessToken(null);
      setToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, logout }),
    [user, token, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
