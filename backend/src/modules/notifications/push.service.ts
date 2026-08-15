// backend/src/modules/notifications/push.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  sendNotification,
  PushSubscription as WebPushSubscription,
} from 'web-push';

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string }>;
  data?: Record<string, unknown>;
}

// 🔥 AJOUT : cache mémoire courte durée pour le logo d'association (même
// pattern que isAllowedOrigin() dans main.ts, 60s) — évite une requête
// Prisma par destinataire quand une notification push part vers plusieurs
// personnes d'un coup (ex. tous les admins d'une antenne).
const LOGO_CACHE_TTL_MS = 60_000;

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private vapidEnabled = false;
  private readonly logoCache = new Map<string, { url: string | null; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  setVapidEnabled(enabled: boolean): void {
    this.vapidEnabled = enabled;
  }

  /**
   * 🔥 AJOUT : résout dynamiquement le logo de l'association pour l'utiliser
   * comme icône de notification push — remplace le repli LCD en dur par le
   * vrai logo de l'association concernée, sans toucher à chaque site
   * d'appel de notifications.service.ts (tous passent déjà associationId).
   */
  private async getAssociationLogoUrl(associationId: string): Promise<string | null> {
    const cached = this.logoCache.get(associationId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.url;
    }

    const association = await this.prisma.association.findUnique({
      where: { id: associationId },
      select: { logoFile: { select: { url: true } } },
    });

    const url = association?.logoFile?.url ?? null;
    this.logoCache.set(associationId, { url, expiresAt: Date.now() + LOGO_CACHE_TTL_MS });
    return url;
  }

  /**
   * Sauvegarde une subscription push pour un utilisateur
   */
  async saveSubscription(
    userId: string,
    associationId: string,
    dto: {
      endpoint: string;
      expirationTime?: number | null;
      keys: { p256dh: string; auth: string };
    },
  ): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, associationId },
      });

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      await this.prisma.pushSubscription.upsert({
        where: { endpoint: dto.endpoint },
        create: {
          userId,
          endpoint: dto.endpoint,
          p256dh: dto.keys.p256dh,
          auth: dto.keys.auth,
          expirationTime: dto.expirationTime
            ? new Date(dto.expirationTime)
            : null,
        },
        update: {
          userId,
          p256dh: dto.keys.p256dh,
          auth: dto.keys.auth,
          expirationTime: dto.expirationTime
            ? new Date(dto.expirationTime)
            : null,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Subscription push sauvegardée pour user ${userId}`);
      return { success: true, message: 'Subscription enregistrée' };
    } catch (error) {
      this.logger.error('Erreur sauvegarde subscription:', error);
      throw error;
    }
  }

  /**
   * Supprime une subscription (désabonnement)
   */
  async removeSubscription(endpoint: string): Promise<void> {
    await this.prisma.pushSubscription.deleteMany({
      where: { endpoint },
    });
    this.logger.log(`Subscription supprimée: ${endpoint.slice(0, 30)}...`);
  }

  /**
   * Envoie une notification push à un utilisateur spécifique
   */
  async sendToUser(
    userId: string,
    associationId: string,
    payload: PushPayload,
  ): Promise<{ sent: number; failed: number }> {
    if (!this.vapidEnabled) {
      this.logger.warn('VAPID non configuré - notification non envoyée');
      return { sent: 0, failed: 1 };
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: {
        userId,
        user: { associationId },
      },
    });

    if (subscriptions.length === 0) {
      this.logger.debug(`Aucune subscription pour user ${userId}`);
      return { sent: 0, failed: 0 };
    }

    // 🔥 AJOUT : icône dynamique par association (logo réel) si l'appelant
    // n'en a pas fourni une explicitement — repli sur l'icône générique de
    // la plateforme seulement si l'association n'a aucun logo.
    const resolvedIcon =
      payload.icon || (await this.getAssociationLogoUrl(associationId)) || '/icon-192x192.png';

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      try {
        const pushSub: WebPushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        const notificationPayload = JSON.stringify({
          notification: {
            title: payload.title,
            body: payload.body,
            icon: resolvedIcon,
            badge: payload.badge || '/badge-72x72.png',
            tag: payload.tag || 'default',
            requireInteraction: payload.requireInteraction ?? false,
            actions: payload.actions || [],
            data: payload.data || {},
          },
        });

        await sendNotification(pushSub, notificationPayload);
        sent++;
        this.logger.debug(`Push envoyée à ${userId}`);
      } catch (error: any) {
        failed++;
        this.logger.error(
          `Erreur push pour ${userId}:`,
          error.message || error,
        );

        // Si l'endpoint est invalide/expiré, on supprime la subscription
        if (error.statusCode === 404 || error.statusCode === 410) {
          await this.removeSubscription(sub.endpoint);
          this.logger.log(
            `Subscription expirée supprimée: ${sub.endpoint.slice(0, 30)}...`,
          );
        }
      }
    }

    return { sent, failed };
  }

  /**
   * Envoie une notification à tous les admins d'une antenne
   */
  async sendToAntennaAdmins(
    antennaId: string,
    associationId: string,
    payload: PushPayload,
  ): Promise<{ sent: number; failed: number }> {
    const assignments = await this.prisma.antennaAdminAssignment.findMany({
      where: {
        antennaId,
        associationId,
        isActive: true,
      },
      select: { adminUserId: true },
    });

    let totalSent = 0;
    let totalFailed = 0;

    for (const assignment of assignments) {
      const result = await this.sendToUser(
        assignment.adminUserId,
        associationId,
        payload,
      );
      totalSent += result.sent;
      totalFailed += result.failed;
    }

    this.logger.log(
      `Push aux admins antenne ${antennaId}: ${totalSent} envoyées, ${totalFailed} échecs`,
    );
    return { sent: totalSent, failed: totalFailed };
  }

  /**
   * Envoie une notification à tous les membres d'une antenne
   */
  async sendToAntennaMembers(
    antennaId: string,
    associationId: string,
    payload: PushPayload,
    excludeUserIds?: string[],
  ): Promise<{ sent: number; failed: number }> {
    const members = await this.prisma.user.findMany({
      where: {
        associationId,
        memberships: {
          some: { antennaId },
        },
        id: excludeUserIds ? { notIn: excludeUserIds } : undefined,
        status: 'ACTIVE',
        pushSubscriptions: { some: {} },
      },
      select: { id: true },
    });

    let totalSent = 0;
    let totalFailed = 0;

    for (const member of members) {
      const result = await this.sendToUser(member.id, associationId, payload);
      totalSent += result.sent;
      totalFailed += result.failed;
    }

    this.logger.log(
      `Push aux membres antenne ${antennaId}: ${totalSent} envoyées, ${totalFailed} échecs`,
    );
    return { sent: totalSent, failed: totalFailed };
  }

  /**
   * Envoie une notification à tous les Super Admins
   */
  async sendToSuperAdmins(
    associationId: string,
    payload: PushPayload,
  ): Promise<{ sent: number; failed: number }> {
    const superAdmins = await this.prisma.user.findMany({
      where: {
        associationId,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE',
        pushSubscriptions: { some: {} },
      },
      select: { id: true },
    });

    let totalSent = 0;
    let totalFailed = 0;

    for (const admin of superAdmins) {
      const result = await this.sendToUser(admin.id, associationId, payload);
      totalSent += result.sent;
      totalFailed += result.failed;
    }

    this.logger.log(
      `Push aux Super Admins: ${totalSent} envoyées, ${totalFailed} échecs`,
    );
    return { sent: totalSent, failed: totalFailed };
  }

  /**
   * Nettoie les subscriptions expirées (job périodique)
   */
  async cleanupExpiredSubscriptions(): Promise<{ deleted: number }> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const result = await this.prisma.pushSubscription.deleteMany({
      where: {
        OR: [
          { updatedAt: { lt: threeMonthsAgo } },
          {
            expirationTime: {
              lt: new Date(),
            },
          },
        ],
      },
    });

    this.logger.log(`${result.count} subscriptions expirées nettoyées`);
    return { deleted: result.count };
  }
}