import { Router } from 'express';
import { authenticate, AuthRequest } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { upload } from '../middlewares/upload';
import { userService } from '../services/user.service';
import { UpdateProfileSchema } from '@electron-chat/schemas';
import { z } from 'zod';

export const usersRouter = Router();
usersRouter.use(authenticate);

// ── GET /api/users/search?q=john ─────────────────────────────
usersRouter.get('/search', async (req: AuthRequest, res, next) => {
  try {
    const q = z.string().min(1).parse(req.query.q);
    const users = await userService.searchUsers(q, req.userId!);
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
});

// ── GET /api/users/contacts ───────────────────────────────────
usersRouter.get('/contacts', async (req: AuthRequest, res, next) => {
  try {
    const contacts = await userService.getContacts(req.userId!);
    res.json({ success: true, data: contacts });
  } catch (err) { next(err); }
});

// ── GET /api/users/contacts/pending ──────────────────────────
usersRouter.get('/contacts/pending', async (req: AuthRequest, res, next) => {
  try {
    const requests = await userService.getPendingRequests(req.userId!);
    res.json({ success: true, data: requests });
  } catch (err) { next(err); }
});

// ── POST /api/users/contacts ──────────────────────────────────
usersRouter.post('/contacts', async (req: AuthRequest, res, next) => {
  try {
    const { targetUserId } = z.object({ targetUserId: z.string().uuid() }).parse(req.body);
    const contact = await userService.sendContactRequest(req.userId!, targetUserId);
    res.status(201).json({ success: true, data: contact });
  } catch (err) { next(err); }
});

// ── PATCH /api/users/contacts/:id ────────────────────────────
usersRouter.patch('/contacts/:id', async (req: AuthRequest, res, next) => {
  try {
    const { accept } = z.object({ accept: z.boolean() }).parse(req.body);
    const result = await userService.respondToContact(req.params.id, req.userId!, accept);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ── GET /api/users/:id ────────────────────────────────────────
usersRouter.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// ── PATCH /api/users/me ───────────────────────────────────────
usersRouter.patch('/me', validate(UpdateProfileSchema), async (req: AuthRequest, res, next) => {
  try {
    const user = await userService.updateProfile(req.userId!, req.body);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});

// ── POST /api/users/me/avatar ─────────────────────────────────
usersRouter.post(
  '/me/avatar',
  upload.single('avatar'),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }
      const user = await userService.uploadAvatar(
        req.userId!,
        req.file.buffer,
        req.file.mimetype
      );
      res.json({ success: true, data: user });
    } catch (err) { next(err); }
  }
);
