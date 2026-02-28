//src/modules/uploads/uploads.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from '../../common/types/auth-user.type';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { LocalStorageProvider } from './storage/local-storage.provider';
import { S3StorageProvider } from './storage/s3-storage.provider';
import { FileCategory, FileVisibility, AuditAction } from '@prisma/client';

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    private readonly localProvider: LocalStorageProvider,
    private readonly s3Provider: S3StorageProvider,
  ) {}

  private get provider() {
    const driver = this.config.get<string>('storage.driver') || 'local';
    return driver === 's3' ? this.s3Provider : this.localProvider;
  }

  async uploadAndCreateFileAsset(params: {
    actor: AuthUser;
    file: Express.Multer.File;
    category?: string;
    folder?: string;
    description?: string;
    isPublic?: boolean;
  }) {
    const driver = this.config.get<string>('storage.driver') || 'local';
    
    const stored = await this.provider.upload({
      buffer: params.file.buffer,
      fileName: params.file.originalname,
      mimeType: params.file.mimetype,
      folder: params.folder || 'uploads',
    });

    const created = await this.prisma.fileAsset.create({
      data: {
        associationId: params.actor.associationId,
        uploadedByUserId: params.actor.id,
        storageProvider: driver, // <-- C'est ce champ qui manquait !
        originalFilename: params.file.originalname,
        storageKey: stored.storageKey,
        url: stored.url,
        mimeType: stored.mimeType ?? params.file.mimetype,
        sizeBytes: stored.sizeBytes ?? BigInt(params.file.size),
        category: (params.category as FileCategory) ?? FileCategory.OTHER,
        visibility: params.isPublic ? FileVisibility.PUBLIC : FileVisibility.PRIVATE,
      },
    });

    await this.audit.log({
      associationId: params.actor.associationId,
      actorUserId: params.actor.id,
      action: AuditAction.CREATE,
      targetModel: 'FileAsset',
      targetId: created.id,
      summary: 'Upload fichier + création FileAsset',
      metadata: {
        originalName: params.file.originalname,
        mimeType: params.file.mimetype,
        size: params.file.size,
      },
    });

    return created;
  }
}