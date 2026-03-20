import { Router } from 'express';
import { authenticate, AuthRequest } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { roomService } from '../services/room.service';
import { CreateRoomSchema, CreateDMSchema } from '@electron-chat/schemas';
import { z } from 'zod';

export const roomsRouter = Router();
roomsRouter.use(authenticate);

// ── GET /api/rooms ─── all rooms for current user ─────────────
roomsRouter.get('/', async (req: AuthRequest, res, next) => {
  try {
    const rooms = await roomService.getUserRooms(req.userId!);
    res.json({ success: true, data: rooms });
  } catch (err) { next(err); }
});

// ── GET /api/rooms/:id ────────────────────────────────────────
roomsRouter.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const room = await roomService.getRoomById(req.params.id, req.userId!);
    res.json({ success: true, data: room });
  } catch (err) { next(err); }
});

// ── POST /api/rooms/dm ─── create or get existing DM ─────────
roomsRouter.post('/dm', validate(CreateDMSchema), async (req: AuthRequest, res, next) => {
  try {
    const { room, created } = await roomService.createOrGetDM(
      req.userId!,
      req.body.targetUserId
    );
    res.status(created ? 201 : 200).json({ success: true, data: room });
  } catch (err) { next(err); }
});

// ── POST /api/rooms ─── create group ─────────────────────────
roomsRouter.post('/', validate(CreateRoomSchema), async (req: AuthRequest, res, next) => {
  try {
    const room = await roomService.createGroup(req.userId!, req.body);
    res.status(201).json({ success: true, data: room });
  } catch (err) { next(err); }
});

// ── PATCH /api/rooms/:id ─── update group info ────────────────
roomsRouter.patch('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = z.object({
      name: z.string().min(1).max(80).optional(),
      description: z.string().max(300).optional(),
    }).parse(req.body);
    const room = await roomService.updateGroup(req.params.id, req.userId!, data);
    res.json({ success: true, data: room });
  } catch (err) { next(err); }
});

// ── POST /api/rooms/:id/members ─── add members ───────────────
roomsRouter.post('/:id/members', async (req: AuthRequest, res, next) => {
  try {
    const { memberIds } = z.object({
      memberIds: z.array(z.string().uuid()).min(1),
    }).parse(req.body);
    const result = await roomService.addMembers(req.params.id, req.userId!, memberIds);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ── DELETE /api/rooms/:id/members/me ─── leave room ──────────
roomsRouter.delete('/:id/members/me', async (req: AuthRequest, res, next) => {
  try {
    const result = await roomService.leaveRoom(req.params.id, req.userId!);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});
