// The bare React contexts, kept apart from the provider components.
//
// WHY a separate file: a module that exports both a component and a non-component
// breaks Vite's Fast Refresh — editing a provider forced a full page reload
// instead of a hot update (and ESLint flagged all four files for it). Contexts
// live here; the *Provider* components and the use* hooks import from here.
import { createContext } from 'react';

export const AuthContext = createContext(null);
export const SocketContext = createContext(null);
export const ThemeContext = createContext(null);
export const ToastContext = createContext(null);
