// backend/src/modules/associations/public-theme.controller.ts
import { Controller, Get, Query, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('public/theme')
export class PublicThemeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getAssociationTheme(@Query('domain') domain?: string, @Query('code') code?: string) {
    if (!domain && !code) {
      throw new NotFoundException("Veuillez fournir un domaine ou un code d'association.");
    }

    // 🔥 FIX BACKEND : Nettoyage du domaine pour ignorer le "www."
    const cleanDomain = domain ? domain.toLowerCase().replace(/^www\./, '').trim() : undefined;

    // On cherche l'association par son domaine (ex: ajvk.lcd.com) ou son code (ASCOK)
    const association = await this.prisma.association.findFirst({
      where: {
        isActive: true,
        OR: [
          cleanDomain ? { domainName: cleanDomain } : undefined,
          code ? { code: code } : undefined,
        ].filter(Boolean) as any,
      },
      include: {
        logoFile: true, // On inclut la relation pour récupérer l'URL du logo
      },
    });

    if (!association) {
      throw new NotFoundException("Association introuvable ou inactive.");
    }

    // On ne renvoie QUE les infos visuelles non-sensibles
    return {
      id: association.id,
      name: association.name,
      logoUrl: association.logoFile?.url || null,
      themeColors: association.themeColors || { primary: '#111827', secondary: '#10B981' },
      fontFamily: association.fontFamily || "'DM Sans', sans-serif",
    };
  }
}