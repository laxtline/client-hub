import { useEffect } from 'react';
import { useSocket } from './useSocket.js';

export function useInvoiceUpdates(refetch) {
  const socket = useSocket();
  useEffect(() => {
    // Reconnecting and returning to a tab also resync changes missed while offline.
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
