// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  isOnline: boolean;
  lastSeen: Date | null;
  createdAt: Date;
}

// ─── Room / Conversation ───────────────────────────────────────────────────────
export type RoomType = 'DIRECT' | 'GROUP';

export interface Room {
  id: string;
  name: string | null;
  type: RoomType;
  avatarUrl: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  members: RoomMember[];
  lastMessage: Message | null;
  unreadCount: number;
}

export interface RoomMember {
  userId: string;
  roomId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  joinedAt: Date;
  user: Pick<User, 'id' | 'name' | 'username' | 'avatarUrl' | 'isOnline'>;
}

// ─── Message ───────────────────────────────────────────────────────────────────
export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'AUDIO' | 'STICKER';
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  sender: Pick<User, 'id' | 'name' | 'username' | 'avatarUrl'>;
  type: MessageType;
  content: string;
  mediaUrl: string | null;
  mediaType: string | null;
  replyToId: string | null;
  replyTo: Pick<Message, 'id' | 'content' | 'sender'> | null;
  mentions: string[];           // array of user IDs mentioned
  reactions: MessageReaction[];
  status: MessageStatus;
  isDeleted: boolean;
  expiresAt: Date | null;       // for disappearing messages
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  userIds: string[];
}

// ─── Socket Events ────────────────────────────────────────────────────────────
export interface ServerToClientEvents {
  'message:new': (message: Message) => void;
  'message:updated': (message: Partial<Message> & { id: string }) => void;
  'message:deleted': (payload: { messageId: string; roomId: string }) => void;
  'message:reaction': (payload: { messageId: string; reactions: MessageReaction[] }) => void;
  'room:typing': (payload: { roomId: string; userId: string; isTyping: boolean }) => void;
  'room:member:online': (payload: { userId: string; isOnline: boolean }) => void;
  'room:updated': (room: Partial<Room> & { id: string }) => void;
  'call:incoming': (payload: CallPayload) => void;
  'call:signal': (payload: SignalPayload) => void;
  'call:ended': (payload: { callId: string }) => void;
  'notification:new': (notification: Notification) => void;
}

export interface ClientToServerEvents {
  'room:join': (roomId: string) => void;
  'room:leave': (roomId: string) => void;
  'room:typing': (payload: { roomId: string; isTyping: boolean }) => void;
  'message:send': (payload: SendMessagePayload) => void;
  'message:react': (payload: { messageId: string; emoji: string }) => void;
  'message:read': (payload: { roomId: string; messageId: string }) => void;
  'call:initiate': (payload: CallPayload) => void;
  'call:signal': (payload: SignalPayload) => void;
  'call:end': (payload: { callId: string }) => void;
}

// ─── Payloads ─────────────────────────────────────────────────────────────────
export interface SendMessagePayload {
  roomId: string;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  mediaType?: string;
  replyToId?: string;
  mentions?: string[];
  expiresIn?: number;   // seconds for disappearing messages
}

export interface CallPayload {
  callId: string;
  roomId: string;
  callerId: string;
  receiverId: string;
  type: 'audio' | 'video';
}

export interface SignalPayload {
  callId: string;
  signal: RTCSessionDescriptionInit | RTCIceCandidateInit;
  targetUserId: string;
}

// ─── Notifications ─────────────────────────────────────────────────────────────
export interface Notification {
  id: string;
  type: 'MESSAGE' | 'MENTION' | 'CALL' | 'FRIEND_REQUEST';
  title: string;
  body: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: Date;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}
