import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api, { setAuthToken, STORAGE_KEY } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [token, setTokenState] = useState(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const setToken = useCallback((t) => {
    setTokenState(t);
    if (t) localStorage.setItem(STORAGE_KEY, t);
    else localStorage.removeItem(STORAGE_KEY);
    setAuthToken(t || null);
    // Prevent cross-user cached data (e.g., results) from leaking.
    queryClient.clear();
  }, [queryClient]);

  useEffect(() => {
    setAuthToken(token);
    if (!token) {
      setUser(null);
      setBootstrapping(false);
      return;
    }
    let cancelled = false;
    api
      .get('/api/auth/me')
      .then(({ data }) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setBootstrapping(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, setToken]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, [setToken]);

  const value = useMemo(
    () => ({
      token,
      user,
      bootstrapping,
      setToken,
      logout,
      isAdmin: user?.role === 'admin',
    }),
    [token, user, bootstrapping, setToken, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
