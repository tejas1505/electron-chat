import { Router } from 'express';
import { authenticate, AuthRequest } from '../middlewares/authenticate';
import { prisma } from '../config/prisma';
import { z } from 'zod';

export const callsRouter = Router();
callsRouter.use(authenticate);

// ── POST /api/calls ─── log a call ────────────────────────────
callsRouter.post('/', async (req: AuthRequest, res, next) => {
  try {
    const body = z.object({
      callId: z.string(),
      roomId: z.string().uuid(),
      receiverId: z.string().uuid(),
      type: z.enum(['AUDIO', 'VIDEO']),
      status: z.enum(['MISSED', 'DECLINED', 'COMPLETED']).default('MISSED'),
      duration: z.number().int().min(0).optional(),
    }).parse(req.body);

    const call = await prisma.call.upsert({
      where: { callId: body.callId },
      update: {
        status: body.status,
        duration: body.duration,
        endedAt: body.status === 'COMPLETED' ? new Date() : undefined,
      },
      create: {
        callId: body.callId,
        roomId: body.roomId,
        callerId: req.userId!,
        receiverId: body.receiverId,
        type: body.type,
        status: body.status,
        startedAt: new Date(),
        duration: body.duration,
      },
    });
    res.json({ success: true, data: call });
  } catch (err) { next(err); }
});

// ── GET /api/calls/history ─── get call history ────────────────
callsRouter.get('/history', async (req: AuthRequest, res, next) => {
  try {
    const calls = await prisma.call.findMany({
      where: {
        OR: [{ callerId: req.userId! }, { receiverId: req.userId! }],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: calls });
  } catch (err) { next(err); }
});
