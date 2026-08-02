// src/modules/notifications/notifications.service.ts
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsQueryDto } from './dto/notifications-query.dto';
import { NotificationType, Prisma } from '@prisma/client';
import { PushService } from './push.service';
import { PushSubscriptionDto } from './dto/push-subscription.dto';

type NotificationListItem = {
  id: string;
  message: string;
  createdAt: string;
  isRead: boolean;
  type?: string | null;
  metadata?: unknown;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService, // Injecte le PushService
  ) {}

  /**
   * Liste les notifications de l'utilisateur connecté
   * 🔥 CORRECTION : associationId maintenant nullable — un SYSTEM_ADMIN
   * (Grand Chef) n'est rattaché à aucune association, donc filtrer dessus
   * excluait systématiquement toutes ses notifications. Le filtre ne
   * s'applique désormais que si associationId est renseigné ; un
   * SYSTEM_ADMIN voit ainsi toutes les notifications qui lui sont adressées,
   * quelle que soit l'association d'origine.
   */
  async listMyNotifications(userId: string, associationId: string | null, query: NotificationsQueryDto): Promise<NotificationListItem[]> {
    const items = await this.prisma.notificationRecipient.findMany({
      where: {
        userId,
        notification: {
          ...(associationId ? { associationId } : {}),
          ...(query.type ? { type: query.type as NotificationType } : {}),
        }
      },
      orderBy: [{ notification: { createdAt: 'desc' } }],
      take: 200,
      include: { notification: true },
    });

    return items.map((item) => ({
      id: item.notification.id,
      message: item.notification.message,
      createdAt: item.notification.createdAt.toISOString(),
      isRead: !!item.readAt,
      type: item.notification.type,
      metadata: item.notification.payload,
    }));
  }

  /**
   * Marque une notification comme lue
   */
  async markAsRead(userId: string, associationId: string | null, notificationId: string): Promise<{ ok: true }> {
    const recipient = await this.prisma.notificationRecipient.findFirst({
      where: { 
        notificationId, 
        userId,
        ...(associationId ? { notification: { associationId } } : {}),
      },
    });

    if (!recipient) throw new NotFoundException('Notification introuvable.');

    await this.prisma.notificationRecipient.update({
      where: { id: recipient.id },
      data: { readAt: new Date() },
    });

    return { ok: true };
  }

  async deleteOne(userId: string, associationId: string | null, notificationId: string): Promise<{ ok: true }> {
    const recipient = await this.prisma.notificationRecipient.findFirst({
      where: {
        notificationId,
        userId,
        ...(associationId ? { notification: { associationId } } : {}),
      },
    });

    if (!recipient) throw new NotFoundException('Notification introuvable.');

    await this.prisma.notificationRecipient.delete({
      where: { id: recipient.id },
    });

    return { ok: true };
  }

  /**
   * Crée une notification pour un utilisateur spécifique
   */
  async createForUser(params: {
    associationId: string;
    userId: string;
    message: string;
    type?: NotificationType;
    metadata?: Prisma.InputJsonValue;
    title?: string;
  }): Promise<{ id: string }> {
    const created = await this.prisma.notification.create({
      data: {
        associationId: params.associationId,
        type: params.type || NotificationType.SYSTEM_ALERT,
        title: params.title || 'Nouvelle notification',
        message: params.message,
        payload: params.metadata || Prisma.JsonNull,
        recipients: {
          create: { userId: params.userId },
        },
      },
    });

    return { id: created.id };
  }

  /**
   * Notifie tous les administrateurs d'une antenne
   */
  async notifyAntennaAdmins(
    antennaId: string,
    associationId: string,
    message: string,
    type: NotificationType,
    metadata?: Prisma.InputJsonValue,
  ) {
    const assignments = await this.prisma.antennaAdminAssignment.findMany({
      where: { antennaId, associationId, isActive: true },
      select: { adminUserId: true },
    });

    if (assignments.length === 0) return;

    await this.prisma.notification.create({
      data: {
        associationId,
        antennaId,
        type,
        title: 'Alerte Antenne',
        message,
        payload: metadata || Prisma.JsonNull,
        recipients: {
          createMany: {
            data: assignments.map((a) => ({ userId: a.adminUserId })),
          },
        },
      },
    });
  }

  /**
   * Notifie le Super Admin (ou tous les Super Admins)
   */
  async notifySuperAdmins(associationId: string, message: string, type: NotificationType) {
    const superAdmins = await this.prisma.user.findMany({
      where: { associationId, role: 'SUPER_ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });

    if (superAdmins.length === 0) return;

    await this.prisma.notification.create({
      data: {
        associationId,
        type,
        title: 'Système Global',
        message,
        recipients: {
          createMany: {
            data: superAdmins.map((sa) => ({ userId: sa.id })),
          },
        },
      },
    });
  }

  /**
   * 🔥 AJOUT : notifie tous les Grand Chef (SYSTEM_ADMIN) de la plateforme.
   * Pas d'associationId — ces notifications sont au niveau plateforme, pas
   * rattachées à une instance cliente en particulier (cohérent avec
   * `Notification.associationId` qui est optionnel dans le schema).
   */
  async notifySystemAdmins(message: string, type: NotificationType, metadata?: Prisma.InputJsonValue) {
    const systemAdmins = await this.prisma.user.findMany({
      where: { role: 'SYSTEM_ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });

    if (systemAdmins.length === 0) return;

    await this.prisma.notification.create({
      data: {
        type,
        title: 'Plateforme',
        message,
        payload: metadata || Prisma.JsonNull,
        recipients: {
          createMany: {
            data: systemAdmins.map((sa) => ({ userId: sa.id })),
          },
        },
      },
    });
  }

  /**
   * 🔥 NOUVEAU : Sauvegarde subscription push
   */
  async savePushSubscription(
    userId: string,
    associationId: string,
    dto: PushSubscriptionDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.pushService.saveSubscription(userId, associationId, dto);
  }

  /**
   * 🔥 NOUVEAU : Crée une notification + envoie push si activé
   */
  async createForUserWithPush(params: {
    associationId: string;
    userId: string;
    message: string;
    type?: NotificationType;
    metadata?: Prisma.InputJsonValue;
    title?: string;
    pushTitle?: string;
    pushBody?: string;
  }): Promise<{ id: string; pushSent: boolean }> {
    const created = await this.prisma.notification.create({
      data: {
        associationId: params.associationId,
        type: params.type || NotificationType.SYSTEM_ALERT,
        title: params.title || 'Nouvelle notification',
        message: params.message,
        payload: params.metadata || Prisma.JsonNull,
        recipients: {
          create: { userId: params.userId },
        },
      },
    });

    let pushSent = false;
    try {
      const userPrefs = await this.prisma.userPreference.findUnique({
        where: { userId: params.userId },
      });

      if (userPrefs?.pushNotifications) {
        const result = await this.pushService.sendToUser(
          params.userId,
          params.associationId,
          {
            title: params.pushTitle || params.title || 'Notification',
            body: params.pushBody || params.message,
            tag: created.id,
            data: {
              notificationId: created.id,
              type: params.type,
              ...((params.metadata as Record<string, unknown>) || {}),
            },
          },
        );
        pushSent = result.sent > 0;
      }
    } catch (error) {
      this.logger.error('Erreur envoi push:', error);
    }

    return { id: created.id, pushSent };
  }

  /**
   * 🔥 NOUVEAU : Notifie admins d'antenne avec push
   */
  async notifyAntennaAdminsWithPush(
    antennaId: string,
    associationId: string,
    message: string,
    type: NotificationType,
    metadata?: Prisma.InputJsonValue,
    pushTitle?: string,
  ): Promise<void> {
    await this.notifyAntennaAdmins(antennaId, associationId, message, type, metadata);

    await this.pushService.sendToAntennaAdmins(antennaId, associationId, {
      title: pushTitle || 'Alerte Antenne',
      body: message,
      tag: `antenna-${antennaId}-${type}`,
      data: {
        antennaId,
        type,
        ...(metadata as Record<string, unknown> || {}),
      },
    });
  }

  /**
   * 🔥 NOUVEAU : Notifie Super Admins avec push
   */
  async notifySuperAdminsWithPush(
    associationId: string,
    message: string,
    type: NotificationType,
    pushTitle?: string,
  ): Promise<void> {
    await this.notifySuperAdmins(associationId, message, type);

    await this.pushService.sendToSuperAdmins(associationId, {
      title: pushTitle || 'Alerte Système',
      body: message,
      tag: `superadmin-${type}`,
      data: { type },
    });
  }
}