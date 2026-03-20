import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { cloudinary } from '../config/cloudinary';
import { AppError } from '../middlewares/errorHandler';
import type { SendMessageInput } from '@electron-chat/schemas';

const RECENT_MESSAGES_CACHE_TTL = 60;
const RECENT_MESSAGES_COUNT = 50;

export class MessageService {
  // ── Send a message ─────────────────────────────────────────
  async sendMessage(senderId: string, data: SendMessageInput) {
    // Verify sender is a member of the room
    const member = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId: senderId, roomId: data.roomId } },
    });
    if (!member) throw new AppError('Not a member of this room', 403);

    // Validate replyTo exists in same room
    if (data.replyToId) {
      const replyTo = await prisma.message.findFirst({
        where: { id: data.replyToId, roomId: data.roomId },
      });
      if (!replyTo) throw new AppError('Reply target not found', 404);
    }

    const expiresAt = data.expiresIn
      ? new Date(Date.now() + data.expiresIn * 1000)
      : undefined;

    const message = await prisma.message.create({
      data: {
        roomId: data.roomId,
        senderId,
        content: data.content,
        type: data.type ?? 'TEXT',
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        replyToId: data.replyToId,
        mentions: data.mentions ?? [],
        expiresAt,
      },
      include: {
        sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
        replyTo: {
          include: {
            sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
          },
        },
        reactions: true,
        statuses: true,
      },
    });

    // Update room's updatedAt for sidebar ordering
    await prisma.room.update({
      where: { id: data.roomId },
      data: { updatedAt: new Date() },
    });

    // Invalidate room message cache
    await redis.del(`room:${data.roomId}:messages`);

    // Create mention notifications
    if (data.mentions && data.mentions.length > 0) {
      await prisma.notification.createMany({
        data: data.mentions.map((userId) => ({
          userId,
          type: 'MENTION' as const,
          title: 'You were mentioned',
          body: `${message.sender.name} mentioned you in a message`,
          data: { roomId: data.roomId, messageId: message.id },
        })),
        skipDuplicates: true,
      });
    }

    return message;
  }

  // ── Get messages (cursor pagination) ──────────────────────
  async getMessages(roomId: string, userId: string, cursor?: string, limit = 30) {
    // Check membership
    const member = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });
    if (!member) throw new AppError('Not a member of this room', 403);

    // Try cache for first page (no cursor)
    if (!cursor) {
      const cacheKey = `room:${roomId}:messages`;
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    const messages = await prisma.message.findMany({
      where: {
        roomId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: {
        sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
        replyTo: {
          include: {
            sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
          },
        },
        reactions: true,
        statuses: { where: { userId } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const data = messages.slice(0, limit).reverse();
    const nextCursor = hasMore ? data[0]?.createdAt.toISOString() : null;

    const result = { data, nextCursor, hasMore };

    // Cache first page
    if (!cursor) {
      await redis.setex(
        `room:${roomId}:messages`,
        RECENT_MESSAGES_CACHE_TTL,
        JSON.stringify(result)
      );
    }

    return result;
  }

  // ── React to message ───────────────────────────────────────
  async reactToMessage(messageId: string, userId: string, emoji: string) {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new AppError('Message not found', 404);

    // Verify membership
    const member = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId, roomId: message.roomId } },
    });
    if (!member) throw new AppError('Not a member of this room', 403);

    // Toggle reaction
    const existing = await prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });

    if (existing) {
      await prisma.messageReaction.delete({ where: { id: existing.id } });
    } else {
      await prisma.messageReaction.create({ data: { messageId, userId, emoji } });
    }

    // Return updated reactions grouped by emoji
    const reactions = await prisma.messageReaction.groupBy({
      by: ['emoji'],
      where: { messageId },
      _count: { userId: true },
    });

    const userIds = await prisma.messageReaction.findMany({
      where: { messageId },
      select: { emoji: true, userId: true },
    });

    await redis.del(`room:${message.roomId}:messages`);

    return reactions.map((r) => ({
      emoji: r.emoji,
      count: r._count.userId,
      userIds: userIds.filter((u) => u.emoji === r.emoji).map((u) => u.userId),
    }));
  }

  // ── Mark messages as read ──────────────────────────────────
  async markAsRead(roomId: string, userId: string, messageId: string) {
    const member = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });
    if (!member) throw new AppError('Not a member', 403);

    await prisma.messageStatus.upsert({
      where: { messageId_userId: { messageId, userId } },
      update: { status: 'READ' },
      create: { messageId, userId, status: 'READ' },
    });
  }

  // ── Delete message ─────────────────────────────────────────
  async deleteMessage(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new AppError('Message not found', 404);
    if (message.senderId !== userId) throw new AppError('Cannot delete others messages', 403);

    await prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, content: 'This message was deleted' },
    });

    await redis.del(`room:${message.roomId}:messages`);
    return { roomId: message.roomId };
  }

  // ── Upload media file via Cloudinary ───────────────────────
  async uploadMedia(fileBuffer: Buffer, mimetype: string, userId: string) {
    const isImage = mimetype.startsWith('image/');
    const isVideo = mimetype.startsWith('video/');
    const resourceType = isVideo ? 'video' : isImage ? 'image' : 'raw';

    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `electron-chat/media/${userId}`,
            resource_type: resourceType,
            // Free tier: max 10MB images, 100MB videos
          },
          (err, res) => {
            if (err || !res) return reject(err);
            resolve(res);
          }
        );
        stream.end(fileBuffer);
      }
    );

    return { url: result.secure_url, publicId: result.public_id, type: resourceType };
  }

  // ── Full-text search ───────────────────────────────────────
  async searchMessages(roomId: string, userId: string, query: string) {
    const member = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });
    if (!member) throw new AppError('Not a member of this room', 403);

    // Postgres full-text search using ILIKE (simple, no tsvector needed for MVP)
    return prisma.message.findMany({
      where: {
        roomId,
        isDeleted: false,
        content: { contains: query, mode: 'insensitive' },
      },
      include: {
        sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  // ── Cleanup expired disappearing messages (run as cron) ───
  async cleanupExpiredMessages() {
    const result = await prisma.message.updateMany({
      where: {
        expiresAt: { lte: new Date() },
        isDeleted: false,
      },
      data: { isDeleted: true, content: 'This message has expired' },
    });
    return result.count;
  }
}

export const messageService = new MessageService();
