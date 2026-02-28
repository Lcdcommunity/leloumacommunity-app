// src/modules/file-assets/file-assets.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FileCategory, FileVisibility } from '@prisma/client';

export type FileAssetResponse = {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
};

@Injectable()
export class FileAssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async createFromUpload(params: {
    associationId: string;
    storedFileName: string;
    originalName: string;
    mimeType: string;
    size: number;
    label?: string;
  }): Promise<FileAssetResponse> {
    if (!params.storedFileName) throw new BadRequestException('Fichier manquant.');

    const created = await this.prisma.fileAsset.create({
      data: {
        associationId: params.associationId,
        storageProvider: 'local',
        storageKey: params.storedFileName,
        originalFilename: params.originalName,
        mimeType: params.mimeType,
        sizeBytes: BigInt(params.size),
        url: `/uploads/${params.storedFileName}`,
        category: FileCategory.OTHER,
        visibility: FileVisibility.PRIVATE,
      },
    });

    return {
      id: created.id,
      fileName: created.storageKey,
      originalName: created.originalFilename,
      mimeType: created.mimeType,
      size: Number(created.sizeBytes),
      url: created.url || '',
      createdAt: created.createdAt.toISOString(),
    };
  }

  async getById(id: string): Promise<FileAssetResponse> {
    const found = await this.prisma.fileAsset.findUnique({
      where: { id },
    });

    if (!found) throw new NotFoundException('Fichier introuvable.');

    return {
      id: found.id,
      fileName: found.storageKey,
      originalName: found.originalFilename,
      mimeType: found.mimeType,
      size: Number(found.sizeBytes),
      url: found.url || '',
      createdAt: found.createdAt.toISOString(),
    };
  }
}