// ToastContext — lightweight, dependency-free toast notifications.
// CONCEPT (React Context): exposes a `toast` API (success/error/info) to the
// whole app so any component can pop a message without prop-drilling. Toasts
// auto-dismiss after a few seconds and stack in the corner. Built in-house
// (no external library) to keep the bundle small and the build simple.
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ToastContext } from './contexts.js';

let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  // Clear any pending auto-dismiss timers if the provider ever unmounts.
  useEffect(() => {
    const pending = timers.current;
    return () => Object.values(pending).forEach(clearTimeout);
  }, []);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  // Core: add a toast of a given type, auto-removing after `duration` ms.
  const push = useCallback(
    (message, type = 'info', duration = 3500) => {
      const id = ++nextId;
      setToasts((list) => [...list, { id, message, type }]);
      timers.current[id] = setTimeout(() => remove(id), duration);
      return id;
    },
    [remove]
  );

  // Convenience helpers — stable identity so consumers can use them freely.
  const toast = useRef({
    success: (m, d) => push(m, 'success', d),
    error: (m, d) => push(m, 'error', d ?? 5000), // errors linger a bit longer
    info: (m, d) => push(m, 'info', d),
  }).current;

  // `toast` and `remove` are already stable; memoising the wrapper object stops
  // every consumer re-rendering each time a toast appears or expires.
  const value = useMemo(() => ({ toast, toasts, remove }), [toast, toasts, remove]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
