// useTheme — read/toggle the light/dark theme from anywhere.
import { useContext } from 'react';
import { ThemeContext } from '../context/contexts.js';

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
