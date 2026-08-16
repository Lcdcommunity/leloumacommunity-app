// backend/src/modules/documents/documents.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentScope } from '@prisma/client';

@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(associationId: string, userId: string, dto: CreateDocumentDto) {
    // Le fichier doit appartenir à la même association — sinon on pourrait
    // publier publiquement un fichier appartenant à une autre instance.
    const fileAsset = await this.prisma.fileAsset.findFirst({
      where: { id: dto.fileAssetId, associationId },
    });
    if (!fileAsset) {
      throw new ForbiddenException("Ce fichier n'appartient pas à votre association.");
    }

    const document = await this.prisma.document.create({
      data: {
        associationId,
        uploadedByUserId: userId,
        fileId: dto.fileAssetId,
        title: dto.title,
        description: dto.description,
        visibility: dto.visibility || 'ALL',
        scope: DocumentScope.GLOBAL,
        isDownloadable: true,
        // Publié immédiatement à la création : pas de brouillon distinct
        // dans ce flux, cohérent avec ce que le frontend envoie aujourd'hui.
        publishedAt: new Date(),
      },
      include: { file: true },
    });

    return this.toItem(document);
  }

  async list(associationId: string, page = 1, pageSize = 20, q?: string) {
    const where = {
      associationId,
      archivedAt: null,
      ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: { file: true },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      items: items.map((d) => this.toItem(d)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async delete(id: string, associationId: string) {
    const doc = await this.prisma.document.findFirst({ where: { id, associationId } });
    if (!doc) throw new NotFoundException('Document introuvable.');

    await this.prisma.document.delete({ where: { id } });
    return { message: 'Document supprimé.' };
  }

  // 🔥 CORRIGÉ : renvoyait fileUrl/fileName à plat au lieu d'un objet
  // fileAsset imbriqué — le frontend (et les mappers admin/membre
  // équivalents, ex. member.mapper.ts::documentItem()) lisent tous
  // doc.fileAsset?.url/fileName/mimeType/sizeBytes. Résultat : le bouton
  // Télécharger, "Fichier original" et "Taille" restaient vides côté
  // super-admin même quand un fichier était bien attaché, et la stat
  // "Avec fichier" comptait toujours 0. sizeBytes est un BigInt côté Prisma
  // (file-assets.service.ts) — converti explicitement en Number, sinon
  // JSON.stringify plante dessus (BigInt non sérialisable nativement).
  private toItem(document: {
    id: string; title: string; description: string | null; visibility: string;
    isPinned: boolean; publishedAt: Date | null; createdAt: Date;
    file: {
      id: string;
      url: string | null;
      originalFilename: string;
      mimeType: string;
      sizeBytes: bigint | number | null;
    } | null;
  }) {
    return {
      id: document.id,
      title: document.title,
      description: document.description,
      visibility: document.visibility,
      isPinned: document.isPinned,
      publishedAt: document.publishedAt?.toISOString() ?? null,
      createdAt: document.createdAt.toISOString(),
      fileAsset: document.file
        ? {
            id: document.file.id,
            url: document.file.url ?? null,
            fileName: document.file.originalFilename ?? null,
            mimeType: document.file.mimeType ?? null,
            sizeBytes: document.file.sizeBytes != null ? Number(document.file.sizeBytes) : null,
          }
        : null,
    };
  }
}