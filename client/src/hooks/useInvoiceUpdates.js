import { useEffect } from 'react';
import { useSocket } from './useSocket.js';

export function useInvoiceUpdates(refetch) {
  const socket = useSocket();
  useEffect(() => {
    // Reload changes missed while the tab was offline.
    socket?.on('invoice:updated', refetch);
    socket?.on('connect', refetch);
    window.addEventListener('focus', refetch);
    return () => {
      socket?.off('invoice:updated', refetch);
      socket?.off('connect', refetch);
      window.removeEventListener('focus', refetch);
    };
  }, [socket, refetch]);
}
