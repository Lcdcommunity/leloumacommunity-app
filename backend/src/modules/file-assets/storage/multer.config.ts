//backend/src/modules/file-assets/storage/multer.config.ts
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';

export const multerDiskStorage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const safeExt = extname(file.originalname || '').slice(0, 10);
    const name = `${randomUUID()}${safeExt}`;
    cb(null, name);
  },
});