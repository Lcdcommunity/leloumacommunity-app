// backend/src/modules/associations/public-theme.controller.ts
import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeDomain } from '../../common/utils/domain.util';

@Controller('public/theme')
export class PublicThemeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getAssociationTheme(@Query('domain') domain?: string, @Query('code') code?: string) {
    if (!domain && !code) {
      throw new NotFoundException("Veuillez fournir un domaine ou un code d'association.");
    }

    const cleanDomain = normalizeDomain(domain);

    const association = await this.prisma.association.findFirst({
      where: {
        isActive: true,
        OR: [
          cleanDomain ? { domainName: cleanDomain } : undefined,
          code ? { code: code } : undefined,
        ].filter(Boolean) as any,
      },
      include: {
        logoFile: true,
      },
    });

    if (!association) {
      throw new NotFoundException('Association introuvable ou inactive.');
    }

    return {
      id: association.id,
      name: association.name,
      logoUrl: association.logoFile?.url || null,
      themeColors: association.themeColors || { primary: '#111827', secondary: '#10B981' },
      fontFamily: association.fontFamily || "'DM Sans', sans-serif",
      phone: association.phone || null,
      email: association.email || null,
      city: association.city || null,
      country: association.country || null,
    };
  }
}