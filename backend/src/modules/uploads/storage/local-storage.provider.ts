// backend/src/modules/uploads/storage/local-storage.provider.ts
//
// v1.1 — 🔥 CORRIGÉ (sécurité) : path traversal. `params.folder` (saisi par le
//   client via POST /uploads/single) était concaténé tel quel dans le chemin
//   disque : `folder=../../src/modules` écrivait hors de ./uploads. Le dossier
//   est désormais assaini (segments [A-Za-z0-9._-], jamais « .. »), l'extension
//   est normalisée (liste noire html/js/php/exe…) et le chemin final est
//   vérifié DANS le dossier d'uploads (assertInsideDirectory). Comportement
//   inchangé pour les dossiers légitimes (« uploads », « proofs »…).
//
import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, isAbsolute } from 'path';
import { randomUUID } from 'crypto';
import { ConfigService } from '@nestjs/config';
import type { StorageProvider, StoredFileResult } from './storage.provider';
import {
  assertInsideDirectory,
  sanitizeStorageExtension,
  sanitizeStorageFolder,
} from '../../../common/utils/safe-storage-path.util';

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
    const folder = sanitizeStorageFolder(params.folder, 'misc');
    const year = String(new Date().getFullYear());
    const ext = sanitizeStorageExtension(params.fileName);
    const key = `${folder}/${year}/${randomUUID()}${ext}`;

    const absoluteDirectory = join(uploadDir, folder, year);
    const absoluteFilePath = join(uploadDir, key);

    // Ceinture + bretelles : le fichier final doit rester dans le dossier d'uploads.
    assertInsideDirectory(uploadDir, absoluteFilePath);

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