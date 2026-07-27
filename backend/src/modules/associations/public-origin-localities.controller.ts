// backend/src/modules/associations/public-origin-localities.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeDomain } from '../../common/utils/domain.util';

@Controller('public/origin-localities')
export class PublicOriginLocalitiesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getOriginLocalities(@Query('domain') domain?: string, @Query('code') code?: string) {
    if (!domain && !code) return { localities: [] };

    const cleanDomain = normalizeDomain(domain);

    const association = await this.prisma.association.findFirst({
      where: {
        isActive: true,
        OR: [
          cleanDomain ? { domainName: cleanDomain } : undefined,
          code ? { code } : undefined,
        ].filter(Boolean) as any,
      },
      select: { originLocalities: true },
    });

    // Domaine sans association correspondante (ex: le Grand Chef), ou association
    // n'ayant configuré aucune liste : tableau vide — le frontend bascule alors
    // automatiquement en champ texte libre, ce n'est pas une erreur.
    return { localities: association?.originLocalities ?? [] };
  }
}