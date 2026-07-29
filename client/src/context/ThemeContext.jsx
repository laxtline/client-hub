// ThemeContext — light/dark theme state, persisted and applied to <html>.
// CONCEPT: Tailwind's class-based dark mode reads a `dark` class on the root
// <html> element. We toggle that class here, remember the choice in
// localStorage, and fall back to the OS preference on first visit.
import { useEffect, useMemo, useState, useCallback } from 'react';
import { ThemeContext } from './contexts.js';

function getInitialTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'light' || saved === 'dark') return saved;
  // No saved choice — respect the operating system's preference.
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  // Apply the theme to <html> and persist it whenever it changes.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    []
  );

  // Memoised so the whole app doesn't re-render on unrelated parent updates.
  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
