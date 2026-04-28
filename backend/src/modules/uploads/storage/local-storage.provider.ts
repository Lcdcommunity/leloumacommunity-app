// backend/src/modules/uploads/storage/local-storage.provider.ts
import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, extname, isAbsolute } from 'path';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import type { StorageProvider, StoredFileResult } from './storage.provider';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly config: ConfigService) {}

  private getUploadDir(): string {
    const configured =
      this.config.get<string>('storage.local.uploadDir') ||
      this.config.get<string>('STORAGE_LOCAL_UPLOAD_DIR') ||
      './uploads';

    return isAbsolute(configured) ? configured : join(process.cwd(), configured);
  }

  private getPublicBaseUrl(): string {
    const fromConfig = this.config.get<string>('storage.local.publicBaseUrl');
    const fromEnv =
      this.config.get<string>('STORAGE_LOCAL_PUBLIC_BASE_URL') ||
      this.config.get<string>('LOCAL_PUBLIC_BASE_URL') ||
      this.config.get<string>('APP_PUBLIC_API_URL') ||
      this.config.get<string>('API_PUBLIC_URL');

    const renderExternalUrl = this.config.get<string>('RENDER_EXTERNAL_URL');

    const base =
      fromConfig ||
      fromEnv ||
      (renderExternalUrl ? `${renderExternalUrl.replace(/\/+$/, '')}/static` : '');

    if (!base) {
      return 'http://localhost:3000/static';
    }

    return base.replace(/\/+$/, '');
  }

  async upload(params: {
    buffer: Buffer;
    fileName: string;
    mimeType?: string;
    folder?: string;
  }): Promise<StoredFileResult> {
    // ⚡ FIX SERVERLESS : Redirection vers /tmp si exécuté sur Vercel (Lecture seule partout ailleurs)
    const isVercel = process.env.VERCEL === '1';
    let uploadDir = this.getUploadDir();
    
    if (isVercel && !uploadDir.startsWith('/tmp')) {
      uploadDir = join('/tmp', 'uploads');
    }

    const publicBaseUrl = this.getPublicBaseUrl();
    const folder = params.folder?.replace(/^\/+|\/+$/g, '') || 'misc';
    const year = String(new Date().getFullYear());
    const ext = extname(params.fileName) || '';
    const key = `${folder}/${year}/${randomUUID()}${ext}`;

    const absoluteDirectory = join(uploadDir, folder, year);
    const absoluteFilePath = join(uploadDir, key);

    await fs.mkdir(absoluteDirectory, { recursive: true });
    await fs.writeFile(absoluteFilePath, params.buffer);

    const url = `${publicBaseUrl}/${key}`;

    return {
      storageKey: key,
      url,
      mimeType: params.mimeType,
      sizeBytes: params.buffer.length,
    };
  }
}