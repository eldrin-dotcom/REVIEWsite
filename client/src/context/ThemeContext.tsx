import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { Theme } from 'shared';

interface ThemeContextType {
  theme: Theme;
  setTheme: (newTheme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user, updateTheme } = useAuth();

  // Pick theme from user profile, or fallback to localStorage, or light
  const theme: Theme =
    user?.theme ||
    ((localStorage.getItem('reviewsite_theme') as Theme) || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('reviewsite_theme', theme);
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('reviewsite_theme', newTheme);
    if (user) {
      await updateTheme(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
