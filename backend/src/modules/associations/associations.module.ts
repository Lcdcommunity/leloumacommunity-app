// backend/src/modules/associations/associations.module.ts
import { Module } from '@nestjs/common';
import { AssociationsController } from './associations.controller';
import { AssociationsService } from './associations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module'; // <-- Ajouté
import { Controller, Get, Query, NotFoundException } from '@nestjs/common'; // <-- Imports ajoutés pour le contrôleur public

// -----------------------------------------------------------------------------
// NOUVEAU: Le Contrôleur Public pour récupérer le Thème Visuel avant la connexion
// -----------------------------------------------------------------------------
@Controller('public/theme')
export class PublicThemeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getAssociationTheme(@Query('domain') domain?: string, @Query('code') code?: string) {
    if (!domain && !code) {
      throw new NotFoundException("Veuillez fournir un domaine ou un code d'association.");
    }

    // On cherche l'association par son domaine (ex: ajvk.lcd.com) ou son code (ASCOK)
    const association = await this.prisma.association.findFirst({
      where: {
        isActive: true,
        OR: [
          domain ? { domainName: domain } : undefined,
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

    // On ne renvoie QUE les infos visuelles non-sensibles pour habiller le Frontend
    return {
      id: association.id,
      name: association.name,
      logoUrl: association.logoFile?.url || null,
      themeColors: association.themeColors || { primary: '#111827', secondary: '#10B981' },
      fontFamily: association.fontFamily || "'DM Sans', sans-serif",
    };
  }
}

// -----------------------------------------------------------------------------
// DÉCLARATION DU MODULE
// -----------------------------------------------------------------------------
@Module({
  imports: [NotificationsModule], // <-- Injection pour les alertes de modifs globales
  controllers: [
    AssociationsController,
    PublicThemeController // <-- INJECTÉ ICI (Pour que l'API /public/theme fonctionne)
  ],
  providers: [AssociationsService, PrismaService],
})
export class AssociationsModule {}