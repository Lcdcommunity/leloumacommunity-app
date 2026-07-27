// backend/src/modules/file-assets/file-assets.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FileCategory, FileVisibility } from '@prisma/client';
import { uploadBufferToCloudinary, deleteFromCloudinary } from './storage/cloudinary.util';

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
    fileBuffer: Buffer;
    originalName: string;
    mimeType: string;
    size: number;
    label?: string;
    category?: FileCategory;
  }): Promise<FileAssetResponse> {
    if (!params.fileBuffer) throw new BadRequestException('Fichier manquant.');

    const uploaded = await uploadBufferToCloudinary(params.fileBuffer, {
      folder: `assograndchef/${params.associationId}`,
    });

    const created = await this.prisma.fileAsset.create({
      data: {
        associationId: params.associationId,
        storageProvider: 'cloudinary',
        storageKey: uploaded.public_id,
        originalFilename: params.originalName,
        mimeType: params.mimeType,
        sizeBytes: BigInt(params.size),
        url: uploaded.secure_url,
        category: params.category || FileCategory.OTHER,
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

  /**
   * 🔥 CORRECTION CHIRURGICALE : Isolation par AssociationId
   */
  async getById(id: string, associationId: string): Promise<FileAssetResponse> {
    const found = await this.prisma.fileAsset.findFirst({
      where: { id, associationId }, // 🔒 Cloisonnement strict
    });

    if (!found) throw new NotFoundException('Fichier introuvable dans votre association.');

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

  /**
   * 🔥 Suppression sécurisée : retire aussi le fichier réel sur Cloudinary,
   * pas seulement la ligne en base (sinon fuite de stockage silencieuse).
   */
  async delete(id: string, associationId: string): Promise<{ success: boolean }> {
    const found = await this.prisma.fileAsset.findFirst({
      where: { id, associationId },
    });

    if (!found) throw new NotFoundException('Fichier introuvable.');

    if (found.storageProvider === 'cloudinary' && found.storageKey) {
      const resourceType = found.mimeType.startsWith('image/') ? 'image' : 'raw';
      await deleteFromCloudinary(found.storageKey, resourceType).catch((err) => {
        console.error(`Échec suppression Cloudinary pour ${found.storageKey}`, err);
      });
    }

    await this.prisma.fileAsset.delete({
      where: { id },
    });

    return { success: true };
  }
}