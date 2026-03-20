import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { cloudinary } from '../config/cloudinary';
import { AppError } from '../middlewares/errorHandler';
import type { UpdateProfileInput } from '@electron-chat/schemas';

const USER_CACHE_TTL = 300; // 5 minutes

export class UserService {
  // ── Get user by ID (with Redis cache) ──────────────────────
  async getUserById(id: string) {
    const cacheKey = `user:${id}`;
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, email: true, name: true, username: true,
        avatarUrl: true, bio: true, isOnline: true,
        lastSeen: true, createdAt: true,
      },
    });
    if (!user) throw new AppError('User not found', 404);

    await redis.setex(cacheKey, USER_CACHE_TTL, JSON.stringify(user));
    return user;
  }

  // ── Search users by name or username ───────────────────────
  async searchUsers(query: string, requesterId: string) {
    return prisma.user.findMany({
      where: {
        AND: [
          { id: { not: requesterId } },
          {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { username: { contains: query, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true, name: true, username: true,
        avatarUrl: true, isOnline: true, bio: true,
      },
      take: 20,
    });
  }

  // ── Update profile ─────────────────────────────────────────
  async updateProfile(userId: string, data: UpdateProfileInput) {
    if (data.username) {
      const existing = await prisma.user.findFirst({
        where: { username: data.username, id: { not: userId } },
      });
      if (existing) throw new AppError('Username already taken', 409);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, email: true, name: true, username: true,
        avatarUrl: true, bio: true, isOnline: true, createdAt: true,
      },
    });

    // Invalidate cache
    await redis.del(`user:${userId}`);
    return user;
  }

  // ── Upload avatar via Cloudinary ───────────────────────────
  async uploadAvatar(userId: string, fileBuffer: Buffer, mimetype: string) {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'electron-chat/avatars',
          public_id: `avatar_${userId}`,
          overwrite: true,
          transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'face' }],
          resource_type: 'image',
        },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(fileBuffer);
    });

    const user = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: result.secure_url },
      select: { id: true, avatarUrl: true },
    });

    await redis.del(`user:${userId}`);
    return user;
  }

  // ── Set online status ──────────────────────────────────────
  async setOnlineStatus(userId: string, isOnline: boolean) {
    await prisma.user.update({
      where: { id: userId },
      data: { isOnline, lastSeen: isOnline ? undefined : new Date() },
    });
    await redis.del(`user:${userId}`);
  }

  // ── Get contacts ───────────────────────────────────────────
  async getContacts(userId: string) {
    const contacts = await prisma.contact.findMany({
      where: {
        OR: [
          { adderId: userId, status: 'ACCEPTED' },
          { receiverId: userId, status: 'ACCEPTED' },
        ],
      },
      include: {
        adder: { select: { id: true, name: true, username: true, avatarUrl: true, isOnline: true, lastSeen: true } },
        receiver: { select: { id: true, name: true, username: true, avatarUrl: true, isOnline: true, lastSeen: true } },
      },
    });

    // Return the "other" person in each contact pair
    return contacts.map((c) => (c.adderId === userId ? c.receiver : c.adder));
  }

  // ── Send contact request ───────────────────────────────────
  async sendContactRequest(adderId: string, receiverId: string) {
    if (adderId === receiverId) throw new AppError('Cannot add yourself', 400);

    const existing = await prisma.contact.findFirst({
      where: {
        OR: [
          { adderId, receiverId },
          { adderId: receiverId, receiverId: adderId },
        ],
      },
    });
    if (existing) throw new AppError('Contact request already exists', 409);

    return prisma.contact.create({
      data: { adderId, receiverId, status: 'PENDING' },
    });
  }

  // ── Accept / decline contact request ──────────────────────
  async respondToContact(contactId: string, userId: string, accept: boolean) {
    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) throw new AppError('Contact request not found', 404);
    if (contact.receiverId !== userId) throw new AppError('Not authorised', 403);

    if (!accept) {
      await prisma.contact.delete({ where: { id: contactId } });
      return { status: 'declined' };
    }

    return prisma.contact.update({
      where: { id: contactId },
      data: { status: 'ACCEPTED' },
    });
  }

  // ── Get pending requests ───────────────────────────────────
  async getPendingRequests(userId: string) {
    return prisma.contact.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      include: {
        adder: { select: { id: true, name: true, username: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const userService = new UserService();
