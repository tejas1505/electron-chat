import { Router } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { redis } from '../config/redis';
import { validate } from '../middlewares/validate';
import { authenticate, AuthRequest } from '../middlewares/authenticate';
import { AppError } from '../middlewares/errorHandler';
import { RegisterSchema, LoginSchema } from '@electron-chat/schemas';

export const authRouter = Router();

// ── Passport: Google OAuth ────────────────────────────────
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: process.env.GOOGLE_CALLBACK_URL!,
}, async (_accessToken, _refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('No email from Google'));

    let user = await prisma.user.findUnique({ where: { googleId: profile.id } });

    if (!user) {
      user = await prisma.user.upsert({
        where: { email },
        update: { googleId: profile.id, avatarUrl: profile.photos?.[0]?.value },
        create: {
          email,
          googleId: profile.id,
          name: profile.displayName,
          username: `user_${profile.id.slice(0, 8)}`,
          avatarUrl: profile.photos?.[0]?.value,
        },
      });
    }

    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

// ── JWT Strategy ─────────────────────────────────────────
passport.use(new JwtStrategy({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_ACCESS_SECRET!,
}, async (payload, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    return done(null, user ?? false);
  } catch (err) {
    return done(err);
  }
}));

// ── Helpers ───────────────────────────────────────────────
function generateTokens(userId: string) {
  const accessToken = jwt.sign({ sub: userId }, process.env.JWT_ACCESS_SECRET!, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  });
  const refreshToken = jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });
  return { accessToken, refreshToken };
}

// ── Routes ────────────────────────────────────────────────

// Register
authRouter.post('/register', validate(RegisterSchema), async (req, res, next) => {
  try {
    const { email, name, username, password } = req.body;

    const exists = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });
    if (exists) throw new AppError('Email or username already taken', 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, name, username, passwordHash },
    });

    const { accessToken, refreshToken } = generateTokens(user.id);
    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 86400000) },
    });

    res.status(201).json({ success: true, data: { accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, username: user.username } } });
  } catch (err) { next(err); }
});

// Login
authRouter.post('/login', validate(LoginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) throw new AppError('Invalid credentials', 401);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError('Invalid credentials', 401);

    const { accessToken, refreshToken } = generateTokens(user.id);
    await prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 86400000) },
    });

    res.json({ success: true, data: { accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, username: user.username } } });
  } catch (err) { next(err); }
});

// Google OAuth
authRouter.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

authRouter.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    const user = req.user as { id: string };
    const { accessToken, refreshToken } = generateTokens(user.id);
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    res.redirect(`${clientUrl}/auth/callback?token=${accessToken}&refresh=${refreshToken}`);
  }
);

// Refresh token
authRouter.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) throw new AppError('No refresh token', 401);

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) throw new AppError('Invalid refresh token', 401);

    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { sub: string };
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(payload.sub);

    await prisma.refreshToken.update({ where: { token: refreshToken }, data: { token: newRefreshToken, expiresAt: new Date(Date.now() + 7 * 86400000) } });

    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch (err) { next(err); }
});

// Logout
authRouter.post('/logout', authenticate, async (req: AuthRequest, res, next) => {
  try {
    await prisma.refreshToken.deleteMany({ where: { userId: req.userId! } });
    await redis.del(`user:${req.userId}:session`);
    res.json({ success: true, message: 'Logged out' });
  } catch (err) { next(err); }
});

// Me
authRouter.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { id: true, email: true, name: true, username: true, avatarUrl: true, bio: true, isOnline: true, createdAt: true },
    });
    if (!user) throw new AppError('User not found', 404);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
});
