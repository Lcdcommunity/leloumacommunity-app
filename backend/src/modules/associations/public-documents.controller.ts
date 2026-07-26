// backend/src/modules/associations/public-documents.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeDomain } from '../../common/utils/domain.util';

@Controller('public/documents')
export class PublicDocumentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async listPublicDocuments(@Query('domain') domain?: string, @Query('code') code?: string) {
    if (!domain && !code) return [];

    const cleanDomain = normalizeDomain(domain);

    const association = await this.prisma.association.findFirst({
      where: {
        isActive: true,
        OR: [
          cleanDomain ? { domainName: cleanDomain } : undefined,
          code ? { code } : undefined,
        ].filter(Boolean) as any,
      },
      select: { id: true },
    });

    // Domaine sans association correspondante (ex: le Grand Chef) : liste vide,
    // pas une erreur — la page de connexion masquera simplement la section.
    if (!association) return [];

    const documents = await this.prisma.document.findMany({
      where: {
        associationId: association.id,
        scope: 'GLOBAL',
        isDownloadable: true,
        publishedAt: { not: null },
      },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
      include: { file: true },
      take: 4,
    });

    return documents.map((d) => ({
      id: d.id,
      title: d.title,
      url: d.file.url,
    }));
  }
}