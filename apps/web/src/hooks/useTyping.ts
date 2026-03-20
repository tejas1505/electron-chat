import { useCallback, useRef } from 'react';
import { getSocket } from '@/services/socket';

export function useTyping(roomId: string) {
  const typingTimer = useRef<ReturnType<typeof setTimeout>>();

  const onType = useCallback(() => {
    const socket = getSocket();
    socket.emit('room:typing', { roomId, isTyping: true });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('room:typing', { roomId, isTyping: false });
    }, 2000);
  }, [roomId]);

  const stopTyping = useCallback(() => {
    clearTimeout(typingTimer.current);
    getSocket().emit('room:typing', { roomId, isTyping: false });
  }, [roomId]);

  return { onType, stopTyping };
}
