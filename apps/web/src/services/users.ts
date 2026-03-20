import { api } from './api';
import type { User } from '@electron-chat/types';

export const usersApi = {
  search: (q: string) =>
    api.get<{ success: boolean; data: User[] }>(`/api/users/search?q=${encodeURIComponent(q)}`).then((r) => r.data.data),

  getById: (id: string) =>
    api.get<{ success: boolean; data: User }>(`/api/users/${id}`).then((r) => r.data.data),

  updateProfile: (data: { name?: string; username?: string; bio?: string }) =>
    api.patch<{ success: boolean; data: User }>('/api/users/me', data).then((r) => r.data.data),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post<{ success: boolean; data: { id: string; avatarUrl: string } }>(
      '/api/users/me/avatar', form
    ).then((r) => r.data.data);
  },

  getContacts: () =>
    api.get<{ success: boolean; data: User[] }>('/api/users/contacts').then((r) => r.data.data),

  getPendingRequests: () =>
    api.get('/api/users/contacts/pending').then((r) => r.data.data),

  sendContactRequest: (targetUserId: string) =>
    api.post('/api/users/contacts', { targetUserId }).then((r) => r.data),

  respondToContact: (contactId: string, accept: boolean) =>
    api.patch(`/api/users/contacts/${contactId}`, { accept }).then((r) => r.data),
};
