import { useContext } from 'react';
import { SocketContext } from '../context/contexts.js';

export function useSocket() {
  return useContext(SocketContext);
}
