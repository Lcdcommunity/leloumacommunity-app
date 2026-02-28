// src/modules/notifications/notifications.service.ts
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

  async createForUser(params: {
    associationId: string;
    userId: string;
    message: string;
    type?: NotificationType;
    metadata?: any;
  }): Promise<{ id: string }> {
    const created = await this.prisma.notification.create({
      data: {
        associationId: params.associationId,
        type: params.type || NotificationType.SYSTEM_ALERT,
        title: 'Nouvelle notification',
        message: params.message,
        payload: params.metadata,
        recipients: {
          create: { userId: params.userId },
        },
      },
    });

    return { id: created.id };
  }
}