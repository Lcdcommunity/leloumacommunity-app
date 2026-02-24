//src/modules/uploads/storage/local-storage.provider.ts
import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import type { StorageProvider, StoredFileResult } from './storage.provider';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly config: ConfigService) {}

  async upload(params: {
    buffer: Buffer;
    fileName: string;
    mimeType?: string;
    folder?: string;
  }): Promise<StoredFileResult> {
    const uploadDir = this.config.get<string>('storage.local.uploadDir') || './uploads';
    const publicBaseUrl =
      this.config.get<string>('storage.local.publicBaseUrl') || 'http://localhost:3000/static';

    const folder = params.folder?.replace(/^\/+|\/+$/g, '') || 'misc';
    const ext = extname(params.fileName) || '';
    const key = `${folder}/${new Date().getFullYear()}/${randomUUID()}${ext}`;
    const abs = join(uploadDir, key);

    await fs.mkdir(join(uploadDir, folder, String(new Date().getFullYear())), {
      recursive: true,
    });
    await fs.writeFile(abs, params.buffer);

    const url = `${publicBaseUrl.replace(/\/$/, '')}/${key}`;

    return {
      storageKey: key,
      url,
      mimeType: params.mimeType,
      sizeBytes: params.buffer.length,
    };
  }
}