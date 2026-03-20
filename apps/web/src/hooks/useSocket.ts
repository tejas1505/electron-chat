import { useEffect, useRef } from 'react';
import { connectSocket, disconnectSocket } from '@/services/socket';
import { useAuthStore } from '@/store/authStore';

export function useSocket() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const initialized = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    // BUG FIX: guard against React StrictMode double-mount
    if (initialized.current) return;
    initialized.current = true;

    try {
      connectSocket();
    } catch (err) {
      console.error('Failed to connect socket:', err);
      initialized.current = false;
    }

    return () => {
      // Only disconnect on real unmount (user logs out etc.)
      // We use a timeout so StrictMode's fake unmount doesn't kill the socket
      const timer = setTimeout(() => {
        if (!useAuthStore.getState().isAuthenticated) {
          disconnectSocket();
          initialized.current = false;
        }
      }, 200);
      return () => clearTimeout(timer);
    };
  }, [isAuthenticated]);
}
