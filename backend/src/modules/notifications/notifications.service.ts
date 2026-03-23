// src/modules/notifications/notifications.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsQueryDto } from './dto/notifications-query.dto';
import { NotificationType } from '@prisma/client';

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
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Liste les notifications de l'utilisateur connecté
   */
  async listMyNotifications(userId: string, query: NotificationsQueryDto): Promise<NotificationListItem[]> {
    const items = await this.prisma.notificationRecipient.findMany({
      where: {
        userId,
        ...(query.type ? { notification: { type: query.type as NotificationType } } : {}),
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
  async markAsRead(userId: string, notificationId: string): Promise<{ ok: true }> {
    const recipient = await this.prisma.notificationRecipient.findFirst({
      where: { notificationId, userId },
    });

    if (!recipient) throw new NotFoundException('Notification introuvable.');

    await this.prisma.notificationRecipient.update({
      where: { id: recipient.id },
      data: { readAt: new Date() },
    });

    return { ok: true };
  }

  /**
   * Crée une notification pour un utilisateur spécifique (Ex: Validation de compte, rejet cotisation)
   */
  async createForUser(params: {
    associationId: string;
    userId: string;
    message: string;
    type?: NotificationType;
    metadata?: any;
    title?: string;
  }): Promise<{ id: string }> {
    const created = await this.prisma.notification.create({
      data: {
        associationId: params.associationId,
        type: params.type || NotificationType.SYSTEM_ALERT,
        title: params.title || 'Nouvelle notification',
        message: params.message,
        payload: params.metadata,
        recipients: {
          create: { userId: params.userId },
        },
      },
    });

    return { id: created.id };
  }

  /**
   * ✅ MÉTHODE AJOUTÉE : Notifie tous les administrateurs d'une antenne
   * Utile pour : Nouveau projet proposé par un membre, nouvelle cotisation soumise.
   */
  async notifyAntennaAdmins(
    antennaId: string,
    associationId: string,
    message: string,
    type: NotificationType,
    metadata?: any,
  ) {
    // 1. Trouver tous les admins actifs de cette antenne
    const assignments = await this.prisma.antennaAdminAssignment.findMany({
      where: { antennaId, isActive: true },
      select: { adminUserId: true },
    });

    if (assignments.length === 0) return;

    // 2. Créer la notification globale et distribuer aux destinataires
    await this.prisma.notification.create({
      data: {
        associationId,
        antennaId,
        type,
        title: 'Alerte Antenne',
        message,
        payload: metadata,
        recipients: {
          createMany: {
            data: assignments.map((a) => ({ userId: a.adminUserId })),
          },
        },
      },
    });
  }

  /**
   * ✅ MÉTHODE AJOUTÉE : Notifie le Super Admin (ou tous les Super Admins)
   * Utile pour : Alertes système critiques, créations d'antennes.
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
}