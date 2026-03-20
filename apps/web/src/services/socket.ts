import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@electron-chat/types';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (!socket) throw new Error('Socket not initialized. Call connectSocket() first.');
  return socket;
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

export function connectSocket(): AppSocket {
  // Don't create a duplicate connection
  if (socket?.connected) return socket;

  const token = useAuthStore.getState().accessToken;
  if (!token) throw new Error('No access token');

  socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  // ── BUG FIX: Join all current rooms on connect/reconnect ──
  // This is the fix for "U2 never sees messages" — on connect
  // we immediately join every room socket channel the user belongs to.
  const joinAllRooms = () => {
    const rooms = useChatStore.getState().rooms;
    rooms.forEach((room) => {
      socket?.emit('room:join', room.id);
    });
  };

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
    joinAllRooms();
  });

  socket.on('reconnect', () => {
    console.log('[Socket] Reconnected');
    joinAllRooms();
  });

  // ── Message handlers ──────────────────────────────────────
  socket.on('message:new', (message) => {
    const store = useChatStore.getState();
    store.addMessage(message);
    // Also update sidebar last message for this room
    store.updateRoomLastMessage(message);
  });

  socket.on('message:updated', (update) => {
    useChatStore.getState().updateMessage(update as any);
  });

  socket.on('message:deleted', ({ messageId, roomId }) => {
    useChatStore.getState().deleteMessage(messageId, roomId);
  });

  socket.on('message:reaction', ({ messageId, reactions }) => {
    useChatStore.getState().updateMessage({ id: messageId, reactions } as any);
  });

  socket.on('room:typing', ({ userId, roomId, isTyping }) => {
    useChatStore.getState().setTyping(userId, roomId, isTyping);
  });

  socket.on('room:member:online', ({ userId, isOnline }) => {
    useChatStore.getState().updateMemberOnlineStatus(userId, isOnline);
  });

  socket.on('disconnect', (reason) => {
    console.warn('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Error:', err.message);
  });

  return socket;
}

// Join a specific room channel (call when user opens a room)
export function joinRoom(roomId: string) {
  if (socket?.connected) {
    socket.emit('room:join', roomId);
  }
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
