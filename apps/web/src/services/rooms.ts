import { api } from './api';
import type { Room } from '@electron-chat/types';
import type { CreateRoomInput } from '@electron-chat/schemas';

export const roomsApi = {
  getAll: () =>
    api.get<{ success: boolean; data: Room[] }>('/api/rooms').then((r) => r.data.data),

  getById: (id: string) =>
    api.get<{ success: boolean; data: Room }>(`/api/rooms/${id}`).then((r) => r.data.data),

  createDM: (targetUserId: string) =>
    api.post<{ success: boolean; data: Room }>('/api/rooms/dm', { targetUserId }).then((r) => r.data.data),

  createGroup: (data: CreateRoomInput) =>
    api.post<{ success: boolean; data: Room }>('/api/rooms', data).then((r) => r.data.data),

  updateGroup: (id: string, data: { name?: string; description?: string }) =>
    api.patch<{ success: boolean; data: Room }>(`/api/rooms/${id}`, data).then((r) => r.data.data),

  addMembers: (id: string, memberIds: string[]) =>
    api.post(`/api/rooms/${id}/members`, { memberIds }).then((r) => r.data),

  leave: (id: string) =>
    api.delete(`/api/rooms/${id}/members/me`).then((r) => r.data),
};
