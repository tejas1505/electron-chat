import { create } from 'zustand';
import type { Room, Message } from '@electron-chat/types';

interface TypingUser { userId: string; roomId: string; }

interface ChatState {
  rooms: Room[];
  activeRoomId: string | null;
  messages: Record<string, Message[]>;
  typingUsers: TypingUser[];
  unreadCounts: Record<string, number>;

  setRooms: (rooms: Room[]) => void;
  upsertRoom: (room: Room) => void;
  setActiveRoom: (roomId: string | null) => void;
  addMessage: (message: Message) => void;
  setMessages: (roomId: string, messages: Message[]) => void;
  prependMessages: (roomId: string, messages: Message[]) => void;
  updateMessage: (message: Partial<Message> & { id: string }) => void;
  deleteMessage: (messageId: string, roomId: string) => void;
  updateRoomLastMessage: (message: Message) => void;
  updateMemberOnlineStatus: (userId: string, isOnline: boolean) => void;
  setTyping: (userId: string, roomId: string, isTyping: boolean) => void;
  markRead: (roomId: string) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  rooms: [],
  activeRoomId: null,
  messages: {},
  typingUsers: [],
  unreadCounts: {},

  setRooms: (rooms) => set({ rooms }),

  // Upsert a single room without wiping the whole list
  upsertRoom: (room) => {
    const { rooms } = get();
    const idx = rooms.findIndex((r) => r.id === room.id);
    if (idx >= 0) {
      const updated = [...rooms];
      updated[idx] = { ...rooms[idx], ...room };
      set({ rooms: updated });
    } else {
      set({ rooms: [room, ...rooms] });
    }
  },

  setActiveRoom: (roomId) => {
    set({ activeRoomId: roomId });
    if (roomId) {
      // Clear unread when opening a room
      const { unreadCounts } = get();
      set({ unreadCounts: { ...unreadCounts, [roomId]: 0 } });
    }
  },

  // BUG FIX: setMessages replaces cleanly — no duplicates
  setMessages: (roomId, messages) => {
    set((state) => ({ messages: { ...state.messages, [roomId]: messages } }));
  },

  // Prepend older messages (load-more / infinite scroll)
  prependMessages: (roomId, newMessages) => {
    if (newMessages.length === 0) return;
    set((state) => {
      const existing = state.messages[roomId] ?? [];
      // Deduplicate by id
      const existingIds = new Set(existing.map((m) => m.id));
      const unique = newMessages.filter((m) => !existingIds.has(m.id));
      return { messages: { ...state.messages, [roomId]: [...unique, ...existing] } };
    });
  },

  addMessage: (message) => {
    set((state) => {
      const roomMessages = state.messages[message.roomId] ?? [];
      // Deduplicate
      if (roomMessages.some((m) => m.id === message.id)) return state;
      const { activeRoomId, unreadCounts } = state;
      return {
        messages: {
          ...state.messages,
          [message.roomId]: [...roomMessages, message],
        },
        unreadCounts: message.roomId !== activeRoomId
          ? { ...unreadCounts, [message.roomId]: (unreadCounts[message.roomId] ?? 0) + 1 }
          : unreadCounts,
      };
    });
  },

  updateMessage: (update) => {
    set((state) => {
      const updated: Record<string, Message[]> = {};
      for (const [roomId, msgs] of Object.entries(state.messages)) {
        updated[roomId] = msgs.map((m) => m.id === update.id ? { ...m, ...update } : m);
      }
      return { messages: updated };
    });
  },

  deleteMessage: (messageId, roomId) => {
    set((state) => {
      const roomMessages = state.messages[roomId] ?? [];
      return {
        messages: {
          ...state.messages,
          [roomId]: roomMessages.map((m) =>
            m.id === messageId
              ? { ...m, isDeleted: true, content: 'This message was deleted' }
              : m
          ),
        },
      };
    });
  },

  // BUG FIX: update sidebar preview when new message arrives via socket
  updateRoomLastMessage: (message: Message) => {
    set((state) => {
      const rooms = state.rooms.map((r) =>
        r.id === message.roomId
          ? { ...r, lastMessage: message, updatedAt: new Date() }
          : r
      );
      // Re-sort by updatedAt so the room floats to top
      rooms.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      return { rooms };
    });
  },

  // BUG FIX: update online status in room members list
  updateMemberOnlineStatus: (userId: string, isOnline: boolean) => {
    set((state) => ({
      rooms: state.rooms.map((r) => ({
        ...r,
        members: r.members.map((m) =>
          m.userId === userId ? { ...m, user: { ...m.user, isOnline } } : m
        ),
      })),
    }));
  },

  setTyping: (userId, roomId, isTyping) => {
    set((state) => {
      const filtered = state.typingUsers.filter(
        (t) => !(t.userId === userId && t.roomId === roomId)
      );
      return {
        typingUsers: isTyping ? [...filtered, { userId, roomId }] : filtered,
      };
    });
  },

  markRead: (roomId) => {
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [roomId]: 0 },
    }));
  },
}));
