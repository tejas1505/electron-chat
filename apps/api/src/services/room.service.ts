import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { AppError } from '../middlewares/errorHandler';
import type { CreateRoomInput } from '@electron-chat/schemas';

// BUG FIX: very short cache to prevent stale sidebar for other users
const ROOM_LIST_CACHE_TTL = 10; // 10 seconds only

export class RoomService {
  async getUserRooms(userId: string) {
    const cacheKey = `user:${userId}:rooms`;
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch {}

    const rooms = await prisma.room.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, username: true, avatarUrl: true, isOnline: true, lastSeen: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: { select: { id: true, name: true, username: true, avatarUrl: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const result = rooms.map((room) => ({
      ...room,
      lastMessage: room.messages[0] ?? null,
      messages: undefined,
    }));

    try {
      await redis.setex(cacheKey, ROOM_LIST_CACHE_TTL, JSON.stringify(result));
    } catch {}
    return result;
  }

  async getRoomById(roomId: string, userId: string) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, username: true, avatarUrl: true, isOnline: true, lastSeen: true },
            },
          },
        },
      },
    });
    if (!room) throw new AppError('Room not found', 404);
    if (!room.members.some((m) => m.userId === userId))
      throw new AppError('Not a member of this room', 403);
    return room;
  }

  async createOrGetDM(userId: string, targetUserId: string) {
    if (userId === targetUserId) throw new AppError('Cannot DM yourself', 400);

    const existing = await prisma.room.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, username: true, avatarUrl: true, isOnline: true, lastSeen: true } },
          },
        },
      },
    });
    if (existing) return { room: existing, created: false };

    const room = await prisma.room.create({
      data: {
        type: 'DIRECT',
        members: {
          create: [
            { userId, role: 'MEMBER' },
            { userId: targetUserId, role: 'MEMBER' },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, username: true, avatarUrl: true, isOnline: true, lastSeen: true } },
          },
        },
      },
    });

    await this.invalidateRoomCaches([userId, targetUserId]);
    return { room: { ...room, lastMessage: null }, created: true };
  }

  async createGroup(userId: string, data: CreateRoomInput) {
    const allMemberIds = [...new Set([userId, ...data.memberIds])];

    const room = await prisma.room.create({
      data: {
        name: data.name,
        description: data.description,
        type: 'GROUP',
        members: {
          create: allMemberIds.map((id) => ({
            userId: id,
            role: id === userId ? 'OWNER' : 'MEMBER',
          })),
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, username: true, avatarUrl: true, isOnline: true, lastSeen: true } },
          },
        },
      },
    });

    await this.invalidateRoomCaches(allMemberIds);
    return { ...room, lastMessage: null };
  }

  async updateGroup(roomId: string, userId: string, data: { name?: string; description?: string }) {
    const member = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });
    if (!member || !['OWNER', 'ADMIN'].includes(member.role))
      throw new AppError('Only admins can edit group info', 403);

    const room = await prisma.room.update({ where: { id: roomId }, data });
    await redis.del(`room:${roomId}`);
    return room;
  }

  async addMembers(roomId: string, requesterId: string, memberIds: string[]) {
    const requester = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId: requesterId, roomId } },
    });
    if (!requester || !['OWNER', 'ADMIN'].includes(requester.role))
      throw new AppError('Only admins can add members', 403);

    const existing = await prisma.roomMember.findMany({
      where: { roomId, userId: { in: memberIds } },
      select: { userId: true },
    });
    const existingIds = new Set(existing.map((m) => m.userId));
    const newIds = memberIds.filter((id) => !existingIds.has(id));

    if (newIds.length > 0) {
      await prisma.roomMember.createMany({
        data: newIds.map((userId) => ({ userId, roomId, role: 'MEMBER' as const })),
      });
    }

    await this.invalidateRoomCaches([requesterId, ...memberIds]);
    return { added: newIds.length };
  }

  async leaveRoom(roomId: string, userId: string) {
    const member = await prisma.roomMember.findUnique({
      where: { userId_roomId: { userId, roomId } },
    });
    if (!member) throw new AppError('Not a member', 404);

    if (member.role === 'OWNER') {
      const successor =
        await prisma.roomMember.findFirst({ where: { roomId, userId: { not: userId }, role: 'ADMIN' } }) ??
        await prisma.roomMember.findFirst({ where: { roomId, userId: { not: userId } } });

      if (successor) {
        await prisma.roomMember.update({ where: { id: successor.id }, data: { role: 'OWNER' } });
      } else {
        await prisma.room.delete({ where: { id: roomId } });
        return { deleted: true };
      }
    }

    await prisma.roomMember.delete({ where: { userId_roomId: { userId, roomId } } });
    await this.invalidateRoomCaches([userId]);
    return { deleted: false };
  }

  async invalidateRoomCaches(userIds: string[]) {
    if (userIds.length === 0) return;
    await redis.del(...userIds.map((id) => `user:${id}:rooms`));
  }
}

export const roomService = new RoomService();
