// useSocket — returns the shared Socket.io instance (or null if not connected).
import { useContext } from 'react';
import { SocketContext } from '../context/contexts.js';

export function useSocket() {
  return useContext(SocketContext);
}
