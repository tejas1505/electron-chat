import { Router } from 'express';
import { authenticate, AuthRequest } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { upload } from '../middlewares/upload';
import { messageService } from '../services/message.service';
import { linkPreviewService } from '../services/link-preview.service';
import { SendMessageSchema, ReactToMessageSchema, CursorPaginationSchema } from '@electron-chat/schemas';
import { z } from 'zod';

export const messagesRouter = Router();
messagesRouter.use(authenticate);

// ── GET /api/messages/:roomId ─────────────────────────────────
messagesRouter.get('/:roomId', async (req: AuthRequest, res, next) => {
  try {
    const { cursor, limit } = CursorPaginationSchema.parse(req.query);
    const result = await messageService.getMessages(req.params.roomId, req.userId!, cursor, limit);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
});

// ── GET /api/messages/:roomId/search ─────────────────────────
messagesRouter.get('/:roomId/search', async (req: AuthRequest, res, next) => {
  try {
    const q = z.string().min(1).parse(req.query.q);
    const results = await messageService.searchMessages(req.params.roomId, req.userId!, q);
    res.json({ success: true, data: results });
  } catch (err) { next(err); }
});

// ── POST /api/messages ────────────────────────────────────────
messagesRouter.post('/', validate(SendMessageSchema), async (req: AuthRequest, res, next) => {
  try {
    const message = await messageService.sendMessage(req.userId!, req.body);
    res.status(201).json({ success: true, data: message });
  } catch (err) { next(err); }
});

// ── POST /api/messages/upload ─────────────────────────────────
messagesRouter.post('/upload', upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
    const result = await messageService.uploadMedia(req.file.buffer, req.file.mimetype, req.userId!);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ── POST /api/messages/link-preview ──────────────────────────
messagesRouter.post('/link-preview', async (req: AuthRequest, res, next) => {
  try {
    const { url } = z.object({ url: z.string().url() }).parse(req.body);
    const preview = await linkPreviewService.getPreview(url);
    res.json({ success: true, data: preview });
  } catch (err) { next(err); }
});

// ── POST /api/messages/:id/react ──────────────────────────────
messagesRouter.post('/:id/react', async (req: AuthRequest, res, next) => {
  try {
    const { emoji } = z.object({ emoji: z.string().min(1).max(10) }).parse(req.body);
    const reactions = await messageService.reactToMessage(req.params.id, req.userId!, emoji);
    res.json({ success: true, data: reactions });
  } catch (err) { next(err); }
});

// ── PATCH /api/messages/:id/read ─────────────────────────────
messagesRouter.patch('/:id/read', async (req: AuthRequest, res, next) => {
  try {
    const { roomId } = z.object({ roomId: z.string().uuid() }).parse(req.body);
    await messageService.markAsRead(roomId, req.userId!, req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// ── DELETE /api/messages/:id ──────────────────────────────────
messagesRouter.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const result = await messageService.deleteMessage(req.params.id, req.userId!);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
});

// ── POST /api/messages/poll ── create poll ────────────────────
messagesRouter.post('/poll', async (req: AuthRequest, res, next) => {
  try {
    const { roomId, question, options } = z.object({
      roomId: z.string().uuid(),
      question: z.string().min(1).max(300),
      options: z.array(z.string().min(1).max(100)).min(2).max(8),
    }).parse(req.body);

    const pollContent = JSON.stringify({ question, options, votes: {}, voters: {} });
    const message = await messageService.sendMessage(req.userId!, {
      roomId,
      content: pollContent,
      type: 'TEXT',
      mentions: [],
    });
    res.status(201).json({ success: true, data: message });
  } catch (err) { next(err); }
});

// ── PATCH /api/messages/:id/poll/vote ────────────────────────
messagesRouter.patch('/:id/poll/vote', async (req: AuthRequest, res, next) => {
  try {
    const { optionIndex } = z.object({ optionIndex: z.number().int().min(0) }).parse(req.body);
    const { prisma } = await import('../config/prisma');
    const msg = await prisma.message.findUnique({ where: { id: req.params.id } });
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });

    const poll = JSON.parse(msg.content);
    if (!poll.options) return res.status(400).json({ success: false, message: 'Not a poll' });

    // Remove previous vote
    const userId = req.userId!;
    const prevVote = poll.voters?.[userId];
    if (prevVote !== undefined) {
      poll.votes[prevVote] = Math.max(0, (poll.votes[prevVote] ?? 1) - 1);
    }

    // Register new vote
    poll.votes[optionIndex] = (poll.votes[optionIndex] ?? 0) + 1;
    poll.voters[userId] = optionIndex;

    const updated = await prisma.message.update({
      where: { id: req.params.id },
      data: { content: JSON.stringify(poll) },
      include: { sender: { select: { id: true, name: true, username: true, avatarUrl: true } } },
    });

    res.json({ success: true, data: updated });
  } catch (err) { next(err); }
});
