import { z } from 'zod';

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(50),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers and underscores'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── User ─────────────────────────────────────────────────────────────────────
export const UpdateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  username: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  bio: z.string().max(160).optional(),
});

// ─── Room ─────────────────────────────────────────────────────────────────────
export const CreateRoomSchema = z.object({
  name: z.string().min(1).max(80),
  description: z.string().max(300).optional(),
  memberIds: z.array(z.string().uuid()).min(1).max(200),
});

export const CreateDMSchema = z.object({
  targetUserId: z.string().uuid(),
});

// ─── Message ──────────────────────────────────────────────────────────────────
export const SendMessageSchema = z.object({
  roomId: z.string().uuid(),
  content: z.string().min(1).max(4000),
  type: z.enum(['TEXT', 'IMAGE', 'VIDEO', 'FILE', 'AUDIO', 'STICKER']).default('TEXT'),
  mediaUrl: z.string().url().optional(),
  mediaType: z.string().optional(),
  replyToId: z.string().uuid().optional(),
  mentions: z.array(z.string().uuid()).max(50).default([]),
  expiresIn: z.number().int().min(5).max(604800).optional(), // 5s to 7 days
});

export const ReactToMessageSchema = z.object({
  messageId: z.string().uuid(),
  emoji: z.string().min(1).max(10),
});

// ─── Pagination ──────────────────────────────────────────────────────────────
export const CursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

// Inferred types
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type CreateRoomInput = z.infer<typeof CreateRoomSchema>;
export type SendMessageInput = z.infer<typeof SendMessageSchema>;
export type CursorPaginationInput = z.infer<typeof CursorPaginationSchema>;
