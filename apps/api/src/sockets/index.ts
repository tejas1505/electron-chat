import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { redisPub, redisSub } from '../config/redis';
import { logger } from '../config/logger';
import jwt from 'jsonwebtoken';
import { messageService } from '../services/message.service';
import { userService } from '../services/user.service';
import { roomService } from '../services/room.service';
import { prisma } from '../config/prisma';
import type { ServerToClientEvents, ClientToServerEvents } from '@electron-chat/types';

export function initSocket(httpServer: HttpServer) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.adapter(createAdapter(redisPub, redisSub));

  // ── Auth ──────────────────────────────────────────────────
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers.authorization?.split(' ')[1];
    if (!token) return next(new Error('Authentication required'));
    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { sub: string };
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ── Connection ────────────────────────────────────────────
  io.on('connection', async (socket) => {
    const userId = socket.data.userId as string;
    logger.info(`Socket connected: ${userId} (${socket.id})`);

    socket.join(`user:${userId}`);
    await userService.setOnlineStatus(userId, true);
    socket.broadcast.emit('room:member:online', { userId, isOnline: true });

    // ── Room management ──────────────────────────────────────
    socket.on('room:join', (roomId) => {
      socket.join(`room:${roomId}`);
    });

    socket.on('room:leave', (roomId) => {
      socket.leave(`room:${roomId}`);
    });

    // ── Typing ────────────────────────────────────────────────
    socket.on('room:typing', ({ roomId, isTyping }) => {
      socket.to(`room:${roomId}`).emit('room:typing', { roomId, userId, isTyping });
    });

    // ── Send message ──────────────────────────────────────────
    socket.on('message:send', async (payload) => {
      try {
        const message = await messageService.sendMessage(userId, payload);

        // Broadcast to room
        io.to(`room:${payload.roomId}`).emit('message:new', message as any);

        // BUG FIX: invalidate room cache for ALL members so U2 gets fresh sidebar
        const members = await prisma.roomMember.findMany({
          where: { roomId: payload.roomId },
          select: { userId: true },
        });
        await roomService.invalidateRoomCaches(members.map((m) => m.userId));

        // Mention notifications
        if (payload.mentions && payload.mentions.length > 0) {
          payload.mentions.forEach((mentionedId) => {
            io.to(`user:${mentionedId}`).emit('notification:new', {
              id: `mention-${message.id}`,
              type: 'MENTION',
              title: 'You were mentioned',
              body: `${message.sender.name} mentioned you`,
              data: { roomId: payload.roomId, messageId: message.id },
              isRead: false,
              createdAt: new Date(),
            });
          });
        }
      } catch (err) {
        logger.error('message:send error', err);
      }
    });

    // ── Reactions ──────────────────────────────────────────────
    socket.on('message:react', async ({ messageId, emoji }) => {
      try {
        const msg = await prisma.message.findUnique({ where: { id: messageId }, select: { roomId: true } });
        if (!msg) return;
        const reactions = await messageService.reactToMessage(messageId, userId, emoji);
        io.to(`room:${msg.roomId}`).emit('message:reaction', { messageId, reactions });
      } catch (err) {
        logger.error('message:react error', err);
      }
    });

    // ── Read receipts ──────────────────────────────────────────
    socket.on('message:read', async ({ roomId, messageId }) => {
      try {
        await messageService.markAsRead(roomId, userId, messageId);
        socket.to(`room:${roomId}`).emit('message:updated', { id: messageId, status: 'READ' } as any);
      } catch (err) {
        logger.error('message:read error', err);
      }
    });

    // ── WebRTC signaling ───────────────────────────────────────
    socket.on('call:initiate', (payload) => {
      io.to(`user:${payload.receiverId}`).emit('call:incoming', payload);
    });

    socket.on('call:signal', (payload) => {
      io.to(`user:${payload.targetUserId}`).emit('call:signal', payload);
    });

    socket.on('call:end', (payload) => {
      socket.broadcast.emit('call:ended', payload);
    });

    // ── Disconnect ─────────────────────────────────────────────
    socket.on('disconnect', async () => {
      logger.info(`Socket disconnected: ${userId}`);
      await userService.setOnlineStatus(userId, false);
      socket.broadcast.emit('room:member:online', { userId, isOnline: false });
    });
  });

  logger.info('Socket.IO initialized with Redis adapter');
  return io;
}
