// useToast — convenience hook to fire toast notifications from anywhere.
//   const { toast } = useToast();
//   toast.success('Saved!');  toast.error('Something went wrong');
import { useContext } from 'react';
import { ToastContext } from '../context/contexts.js';

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
