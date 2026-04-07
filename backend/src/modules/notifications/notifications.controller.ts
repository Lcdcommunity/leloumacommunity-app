// backend/src/modules/notifications/notifications.controller.ts
import { Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { NotificationsQueryDto } from './dto/notifications-query.dto';
import { NotificationType } from '@prisma/client';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly service: NotificationsService,
    private readonly pushService: PushService, // 🔥 Ajouté pour le test d'envoi direct
  ) {}

  @Get()
  listMine(@CurrentUser() user: AuthUser, @Query() query: NotificationsQueryDto) {
    // 🔒 Injection chirurgicale de l'associationId pour le filtrage
    return this.service.listMyNotifications(user.id, user.associationId, query);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    // 🔒 Injection chirurgicale de l'associationId pour la sécurité
    return this.service.markAsRead(user.id, user.associationId, id);
  }

  /**
   * 🔥 ROUTE DE TEST : Permet de déclencher manuellement tes exemples de notifications Push.
   * Note : En production, ces extraits de code iront dans tes services métiers 
   * (ex: ContributionsService, MembersService, etc.).
   */
  @Post('test-push')
  async testPushNotifications(@CurrentUser() user: AuthUser) {
    // 1. Notification simple à un utilisateur
    await this.service.createForUserWithPush({
      associationId: user.associationId,
      userId: user.id,
      message: 'Votre cotisation a été validée !',
      type: NotificationType.CONTRIBUTION_VALIDATED,
      title: 'Cotisation validée',
      pushTitle: '✅ Cotisation validée',
      pushBody: 'Votre paiement de 50€ a été confirmé',
    });

    // 2. Notification push directe (sans créer de notification en base)
    await this.pushService.sendToUser(user.id, user.associationId, {
      title: 'Rappel',
      body: 'Votre cotisation est en retard',
      tag: 'reminder-cotisation',
      requireInteraction: true,
      actions: [
        { action: 'pay', title: 'Payer maintenant' },
        { action: 'dismiss', title: 'Ignorer' },
      ],
    });

    // 3. Notification aux admins d'antenne (Commenté car nécessite un vrai antennaId)
    /*
    await this.service.notifyAntennaAdminsWithPush(
      'ID_DE_L_ANTENNE_ICI',
      user.associationId,
      'Nouveau membre en attente de validation',
      NotificationType.ACCOUNT_APPROVED, // Ajusté selon ton schéma Prisma
      { memberId: user.id },
      'Nouveau membre',
    );
    */

    return { message: 'Tests de notifications push envoyés avec succès !' };
  }
}