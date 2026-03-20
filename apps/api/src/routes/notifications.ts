import { Router } from 'express';
import { authenticate, AuthRequest } from '../middlewares/authenticate';
import { prisma } from '../config/prisma';
import { z } from 'zod';

export const notificationsRouter = Router();
notificationsRouter.use(authenticate);

// ── GET /api/notifications ────────────────────────────────────
notificationsRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const { limit = '20', cursor } = req.query as Record<string, string>;
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.userId!,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit) + 1,
    });

    const hasMore = notifications.length > Number(limit);
    const data = notifications.slice(0, Number(limit));

    res.json({
      success: true,
      data,
      nextCursor: hasMore ? data[data.length - 1]?.createdAt.toISOString() : null,
      hasMore,
    });
  } catch (err) { next(err); }
});

// ── GET /api/notifications/unread-count ───────────────────────
notificationsRouter.get('/unread-count', async (req: AuthRequest, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.userId!, isRead: false },
    });
    res.json({ success: true, data: { count } });
  } catch (err) { next(err); }
});

// ── PATCH /api/notifications/:id/read ────────────────────────
notificationsRouter.patch('/:id/read', async (req: AuthRequest, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.userId! },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── PATCH /api/notifications/read-all ────────────────────────
notificationsRouter.patch('/read-all', async (req: AuthRequest, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId!, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── DELETE /api/notifications/:id ────────────────────────────
notificationsRouter.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    await prisma.notification.deleteMany({
      where: { id: req.params.id, userId: req.userId! },
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});
