////// backend/src/modules/notifications/notifications.controller.ts
// Import — ajoute Delete
import { Controller, Get, Param, Patch, Delete, Post, Query, UseGuards, Body, ForbiddenException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { NotificationsQueryDto } from './dto/notifications-query.dto';
import { NotificationType, UserRole } from '@prisma/client';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly pushService: PushService, 
  ) {}

  @Get()
  listMine(@CurrentUser() user: AuthUser, @Query() query: NotificationsQueryDto) {
    return this.service.listMyNotifications(user.id, user.associationId, query);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.markAsRead(user.id, user.associationId, id);
  }
  // Route — ajoute après @Patch(':id/read')
@Delete(':id')
deleteOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
  return this.service.deleteOne(user.id, user.associationId, id);
}

  @Post('test-push')
  async testPushNotifications(@CurrentUser() user: AuthUser) {
    await this.service.createForUserWithPush({
      associationId: user.associationId,
      userId: user.id,
      message: 'Votre cotisation a été validée !',
      type: NotificationType.CONTRIBUTION_VALIDATED,
      title: 'Cotisation validée',
      pushTitle: '✅ Cotisation validée',
      pushBody: 'Votre paiement a été confirmé',
    });

    return { message: 'Tests de notifications push envoyés avec succès !' };
  }

  /**
   * 🔥 AJOUT CHIRURGICAL : Route de diffusion gérant les sélections multiples (targetIds)
   */
  @Post('dispatch')
  async dispatchCustomCommunication(
    @CurrentUser() user: AuthUser,
    @Body() body: {
      targetType: 'ALL' | 'ANTENNA' | 'MEMBER';
      targetId?: string; // Gardé pour compatibilité ascendante
      targetIds?: string[]; // NOUVEAU: Pour la sélection de multiples membres
      channels: { inApp: boolean; push: boolean; email: boolean; sms: boolean };
      title: string;
      message: string;
    }
  ) {
    let targetUsers: { id: string }[] = [];
    const prisma = (this.service as any).prisma;

    // --- LOGIQUE DE SÉCURITÉ POUR L'ADMIN D'ANTENNE ---
    let allowedAntennaIds: string[] = [];
    if (user.role === UserRole.ANTENNA_ADMIN) {
      const assignments = await prisma.antennaAdminAssignment.findMany({
        where: { adminUserId: user.id, isActive: true },
        select: { antennaId: true }
      });
      allowedAntennaIds = assignments.map(a => a.antennaId);
      
      if (allowedAntennaIds.length === 0) {
        throw new ForbiddenException("Vous n'avez aucune antenne active assignée.");
      }

      // Si l'admin d'antenne choisit "ALL", on restreint silencieusement à SES antennes
      if (body.targetType === 'ALL') {
        body.targetType = 'ANTENNA';
        body.targetId = allowedAntennaIds[0]; // On prend la première par défaut ou on gère ça plus bas
      }
    }

    // --- RECHERCHE DES CIBLES ---
    if (body.targetType === 'ALL' && user.role === UserRole.SUPER_ADMIN) {
      // Super Admin: Toute l'asso
      targetUsers = await prisma.user.findMany({
        where: { associationId: user.associationId, status: 'ACTIVE' },
        select: { id: true }
      });
    } 
    else if (body.targetType === 'ANTENNA') {
      // Filtrage par Antenne
      const searchAntennaIds = user.role === UserRole.ANTENNA_ADMIN 
        ? allowedAntennaIds // Si admin antenne, il cible forcément ses propres antennes
        : [body.targetId]; // Si super admin, l'antenne qu'il a choisie

      targetUsers = await prisma.user.findMany({
        where: { 
          associationId: user.associationId, 
          status: 'ACTIVE',
          memberships: { some: { antennaId: { in: searchAntennaIds as string[] } } }
        },
        select: { id: true }
      });
    } 
    else if (body.targetType === 'MEMBER') {
      // Filtrage par Membres Spécifiques (Tableau de IDs)
      const idsToSearch = body.targetIds && body.targetIds.length > 0 
        ? body.targetIds 
        : (body.targetId ? [body.targetId] : []);

      targetUsers = await prisma.user.findMany({
        where: { 
          id: { in: idsToSearch },
          associationId: user.associationId,
          // Si c'est un Admin d'Antenne, on vérifie que ces membres sont bien dans son/ses antennes
          ...(user.role === UserRole.ANTENNA_ADMIN ? {
            memberships: { some: { antennaId: { in: allowedAntennaIds } } }
          } : {})
        },
        select: { id: true }
      });
    }

    if (targetUsers.length === 0) {
      return { message: "Aucun membre valide trouvé pour cette cible (ou droits insuffisants)." };
    }

    // --- ENVOI DES NOTIFICATIONS ---
    const promises = targetUsers.map(async (targetUser) => {
      if (body.channels.inApp || body.channels.push) {
        await this.service.createForUserWithPush({
          associationId: user.associationId,
          userId: targetUser.id,
          type: NotificationType.SYSTEM_ALERT, 
          title: body.title,
          message: body.message,
          pushTitle: body.channels.push ? body.title : undefined,
          pushBody: body.channels.push ? body.message : undefined,
        }).catch((e: any) => console.error(`Erreur Push pour ${targetUser.id}`, e));
      }
    });

    await Promise.all(promises);

    return { message: `Message diffusé avec succès à ${targetUsers.length} membre(s).` };
  }
}