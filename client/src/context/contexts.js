// Context objects stay here so provider edits work with Fast Refresh.
import { createContext } from 'react';

export const AuthContext = createContext(null);
export const SocketContext = createContext(null);
export const ThemeContext = createContext(null);
export const ToastContext = createContext(null);
