import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { User, Theme } from 'shared';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateTheme: (theme: Theme) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check existing session on load
  const checkSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setUser(json.data);
        }
      }
    } catch (err) {
      console.warn('Session check failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Login failed');
    }

    setUser(json.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setUser(null);
    }
  }, []);

  const updateTheme = useCallback(async (newTheme: Theme) => {
    try {
      const res = await fetch('/api/auth/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ theme: newTheme }),
      });

      if (res.ok) {
        setUser((prev) => (prev ? { ...prev, theme: newTheme } : null));
      }
    } catch (err) {
      console.error('Failed to update theme on server:', err);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateTheme }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
