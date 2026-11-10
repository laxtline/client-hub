import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { ToastContext } from './contexts.js';

let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

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

  const push = useCallback(
    (message, type = 'info', duration = 3500) => {
      const id = ++nextId;
      setToasts((list) => [...list, { id, message, type }]);
      timers.current[id] = setTimeout(() => remove(id), duration);
      return id;
    },
    [remove]
  );

  const toast = useRef({
    success: (m, d) => push(m, 'success', d),
    error: (m, d) => push(m, 'error', d ?? 5000), 
    info: (m, d) => push(m, 'info', d),
  }).current;

  const value = useMemo(() => ({ toast, toasts, remove }), [toast, toasts, remove]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}
