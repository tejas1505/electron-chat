import multer from 'multer';
import { AppError } from './errorHandler';

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm',
  'application/pdf',
  'audio/mpeg', 'audio/ogg', 'audio/webm',
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB (Cloudinary free tier)

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`File type ${file.mimetype} not allowed`, 415));
    }
  },
});
