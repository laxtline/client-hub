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
        // Silently fail - no valid session
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
      // backend logout failed (network, token already revoked, etc.)
      // but we still clear local state so user isn't stuck
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
