// src/modules/uploads/uploads.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/types/auth-user.type';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { LocalStorageProvider } from './storage/local-storage.provider';
import { S3StorageProvider } from './storage/s3-storage.provider';
import { CloudinaryService } from './cloudinary.service';
import { FileCategory, FileVisibility, AuditAction } from '@prisma/client';

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly localProvider: LocalStorageProvider,
    private readonly s3Provider: S3StorageProvider,
    private readonly cloudinaryProvider: CloudinaryService,
  ) {}

  private get currentDriver(): string {
    return this.config.get<string>('STORAGE_DRIVER') || 'local';
  }

  async uploadAndCreateFileAsset(params: {
    actor: AuthUser;
    file: Express.Multer.File;
    category?: string;
    folder?: string;
    description?: string;
    isPublic?: boolean;
  }) {
    const driver = this.currentDriver;
    let stored: { url: string; storageKey: string; mimeType?: string; sizeBytes?: bigint };

    if (driver === 'cloudinary') {
      const res = await this.cloudinaryProvider.uploadFile(params.file);
      stored = {
        url: res.secure_url,
        storageKey: res.public_id,
        mimeType: `${res.resource_type}/${res.format}`,
        sizeBytes: BigInt(res.bytes),
      };
    } else if (driver === 's3') {
      const s3Res = await this.s3Provider.upload({
        buffer: params.file.buffer,
        fileName: params.file.originalname,
        mimeType: params.file.mimetype,
        folder: params.folder || 'uploads',
      });
      stored = {
        ...s3Res,
        sizeBytes: s3Res.sizeBytes ? BigInt(s3Res.sizeBytes) : BigInt(params.file.size),
      };
    } else {
      const localRes = await this.localProvider.upload({
        buffer: params.file.buffer,
        fileName: params.file.originalname,
        mimeType: params.file.mimetype,
        folder: params.folder || 'uploads',
      });
      stored = {
        ...localRes,
        sizeBytes: localRes.sizeBytes ? BigInt(localRes.sizeBytes) : BigInt(params.file.size),
      };
    }

    const created = await this.prisma.fileAsset.create({
      data: {
        associationId: params.actor.associationId,
        uploadedByUserId: params.actor.id,
        storageProvider: driver,
        originalFilename: params.file.originalname,
        storageKey: stored.storageKey,
        url: stored.url,
        mimeType: stored.mimeType ?? params.file.mimetype,
        sizeBytes: stored.sizeBytes ?? BigInt(params.file.size),
        category: (params.category as FileCategory) ?? FileCategory.OTHER,
        visibility: params.isPublic ? FileVisibility.PUBLIC : FileVisibility.PRIVATE,
      },
    });

    // ✅ CORRECTION LOG : targetModel -> entity | summary/metadata -> details
    await this.audit.log({
      associationId: params.actor.associationId,
      actorUserId: params.actor.id,
      action: AuditAction.CREATE,
      entity: 'FileAsset',
      entityId: created.id,
      details: {
        summary: `Upload fichier (${driver}) + création FileAsset`,
        originalName: params.file.originalname,
        mimeType: params.file.mimetype,
        size: params.file.size.toString(),
        provider: driver,
      },
    });

    return created;
  }
}