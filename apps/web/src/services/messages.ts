import { api } from './api';
import type { Message } from '@electron-chat/types';

export const messagesApi = {
  getMessages: (roomId: string, cursor?: string, limit = 30) =>
    api.get<{ success: boolean; data: Message[]; nextCursor: string | null; hasMore: boolean }>(
      `/api/messages/${roomId}`,
      { params: { cursor, limit } }
    ).then((r) => r.data),

  search: (roomId: string, q: string) =>
    api.get<{ success: boolean; data: Message[] }>(
      `/api/messages/${roomId}/search?q=${encodeURIComponent(q)}`
    ).then((r) => r.data.data),

  uploadFile: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ success: boolean; data: { url: string; type: string } }>(
      '/api/messages/upload', form
    ).then((r) => r.data.data);
  },

  react: (messageId: string, emoji: string) =>
    api.post(`/api/messages/${messageId}/react`, { emoji }).then((r) => r.data),

  markRead: (messageId: string, roomId: string) =>
    api.patch(`/api/messages/${messageId}/read`, { roomId }).then((r) => r.data),

  delete: (messageId: string) =>
    api.delete(`/api/messages/${messageId}`).then((r) => r.data),
};
