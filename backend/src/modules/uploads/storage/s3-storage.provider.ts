//src/modules/uploads/storage/s3-storage.provider.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import type { StorageProvider, StoredFileResult } from './storage.provider';

@Injectable()
export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('storage.s3.bucket') || '';
    this.publicBaseUrl = this.config.get<string>('storage.s3.publicBaseUrl') || '';

    this.client = new S3Client({
      region: this.config.get<string>('storage.s3.region') || 'eu-west-1',
      endpoint: this.config.get<string>('storage.s3.endpoint') || undefined,
      forcePathStyle: Boolean(this.config.get<boolean>('storage.s3.forcePathStyle')),
      credentials: {
        accessKeyId: this.config.get<string>('storage.s3.accessKeyId') || '',
        secretAccessKey: this.config.get<string>('storage.s3.secretAccessKey') || '',
      },
    });
  }

  async upload(params: {
    buffer: Buffer;
    fileName: string;
    mimeType?: string;
    folder?: string;
  }): Promise<StoredFileResult> {
    if (!this.bucket) {
      throw new Error('S3 bucket non configuré');
    }

    const folder = params.folder?.replace(/^\/+|\/+$/g, '') || 'misc';
    const ext = extname(params.fileName) || '';
    const key = `${folder}/${new Date().getFullYear()}/${randomUUID()}${ext}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: params.buffer,
        ContentType: params.mimeType || 'application/octet-stream',
      }),
    );

    const url = this.publicBaseUrl
      ? `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`
      : key;

    return {
      storageKey: key,
      url,
      mimeType: params.mimeType,
      sizeBytes: params.buffer.length,
    };
  }
}