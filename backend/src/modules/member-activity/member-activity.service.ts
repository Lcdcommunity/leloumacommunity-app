// backend/src/modules/member-activity/member-activity.service.ts
//
// v1.0 — NOUVEAU : compteurs pour le bandeau "Actions requises" côté
// membre. Module isolé, ne modifie ni member.service.ts ni admin.service.ts.
//
// Deux stratégies de comptage selon la nature de l'info :
// - "Cotisation payée par un tiers" / dépenses / documents / informations :
//   aucune trace "lu/non lu" n'existe pour ces événements (les membres ne
//   sont pas notifiés individuellement à leur création). On compte donc les
//   éléments RÉCENTS (fenêtre de RECENT_WINDOW_DAYS jours) — la carte
//   s'éteint d'elle-même avec le temps, sans infrastructure supplémentaire.
// - "Communications" : depuis communications.service.ts v1.1, chaque envoi
//   crée une vraie notification in-app par destinataire (payload
//   { kind: 'communication' }). On compte donc les NON LUES via
//   NotificationRecipient.readAt — précis, et se vide naturellement quand
//   le membre consulte ses notifications.
// - "Événements à confirmer" : vraie file d'attente (RSVP non encore
//   donné) — réutilise EventsService.listEvents() (déjà injectable, exporté
//   par EventsModule) plutôt que de redupliquer sa logique de visibilité
//   (antenne globale / ciblée / invitations spécifiques), qui est fine et
//   fragile à reproduire correctement à la main.
//
import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContributionStatus, ExpenseStatus, PostStatus, UserRole } from '@prisma/client';
import { EventsService } from '../events/events.service';

const RECENT_WINDOW_DAYS = 7;

export interface MemberPendingActionsResult {
  eventsToRespond: number;
  contributionsBySomeoneElse: number;
  recentExpenses: number;
  recentDocuments: number;
  recentContents: number;
  unreadCommunications: number;
}

@Injectable()
export class MemberActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  private async resolveMemberContext(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        associationId: true,
        memberships: { select: { antennaId: true, isPrimary: true } },
      },
    });

    if (!user || !user.associationId) {
      throw new ForbiddenException('Utilisateur introuvable.');
    }

    const membership = user.memberships.find((m) => m.isPrimary) ?? user.memberships[0];

    return {
      associationId: user.associationId,
      antennaId: membership?.antennaId ?? null,
    };
  }

  async getPendingActions(userId: string): Promise<MemberPendingActionsResult> {
    const { associationId, antennaId } = await this.resolveMemberContext(userId);
    const recentCutoff = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();

    const [
      contributionsBySomeoneElse,
      recentExpenses,
      recentDocuments,
      recentContents,
      unreadCommunications,
      eventsResult,
    ] = await Promise.all([
      // Cotisation payée pour ce membre par un admin ou un autre membre —
      // même logique de détection que le formulaire "Cotiser pour un
      // membre" (submitterUserId renseigné et différent du bénéficiaire).
      this.prisma.contribution.count({
        where: {
          memberUserId: userId,
          submitterUserId: { not: null },
          NOT: { submitterUserId: userId },
          status: ContributionStatus.VALIDATED,
          validatedAt: { gte: recentCutoff },
        },
      }),

      // Dépenses validées de l'antenne du membre — hypothèse : même
      // scope antenne que le reste de l'app (à ajuster si
      // listMemberExpenses() utilise une autre portée).
      antennaId
        ? this.prisma.expense.count({
            where: {
              antennaId,
              status: ExpenseStatus.VALIDATED,
              validatedAt: { gte: recentCutoff },
            },
          })
        : Promise.resolve(0),

      // Documents récents — même règle de visibilité que
      // member.service.ts::listDocuments (ALL/MEMBER partout, ANTENNA
      // seulement pour l'antenne du membre).
      this.prisma.document.count({
        where: {
          associationId,
          archivedAt: null,
          publishedAt: { not: null, gte: recentCutoff },
          OR: [
            { visibility: { in: ['ALL', 'MEMBER'] } },
            ...(antennaId ? [{ antennaId, visibility: { in: ['ALL', 'MEMBER', 'ANTENNA'] } }] : []),
          ],
        },
      }),

      // Informations/actualités récentes — même portée que
      // member.service.ts::listContents (aucun filtre d'antenne, toutes
      // les publications de l'association sont visibles).
      this.prisma.newsPost.count({
        where: {
          associationId,
          status: PostStatus.PUBLISHED,
          publishedAt: { not: null, gte: recentCutoff },
        },
      }),

      // Communications non lues — précis via NotificationRecipient.readAt,
      // cf. communications.service.ts v1.1.
      this.prisma.notificationRecipient.count({
        where: {
          userId,
          readAt: null,
          notification: {
            associationId,
            payload: { path: ['kind'], equals: 'communication' },
          },
        },
      }),

      // Événements publiés visibles par ce membre — réutilise la logique
      // de visibilité déjà correcte d'EventsService (global / antenne /
      // invitations ciblées).
      this.eventsService.listEvents(userId, UserRole.MEMBER, associationId, 1, 100, 'PUBLISHED'),
    ]);

    const eventsToRespond = (
      eventsResult.items as unknown as Array<{ startsAt: Date; attendees: Array<{ status: string }> }>
    ).filter((e) => e.attendees.length === 0 && new Date(e.startsAt) >= now).length;

    return {
      eventsToRespond,
      contributionsBySomeoneElse,
      recentExpenses,
      recentDocuments,
      recentContents,
      unreadCommunications,
    };
  }
}