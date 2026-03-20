import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1] ?? req.cookies?.accessToken;

  if (!token) {
    return next(new AppError('No token provided', 401, 'UNAUTHORIZED'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401, 'TOKEN_EXPIRED'));
  }
}
