// backend/src/modules/jobs/jobs.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationType, ReminderKind, CurrencyCode, Prisma } from '@prisma/client';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly ledger: LedgerService,
  ) {}

  /**
   * Purge les tokens d'authentification expirés ou consommés (Action Globale).
   */
  async purgeExpiredAuthTokens(): Promise<{ cleaned: number }> {
    const now = new Date();

    const res = await this.prisma.authToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: now } },
          { consumedAt: { not: null } },
        ],
      },
    });

    this.logger.log(`purgeExpiredAuthTokens: supprimé ${res.count} tokens.`);
    return { cleaned: res.count };
  }

  /**
   * Recalcule les soldes et génère des snapshots.
   * 🔥 AMÉLIORATION : Peut être filtré par associationId pour l'isolation.
   */
  async generateBalanceSnapshots(associationId?: string): Promise<{ updated: number }> {
    const associations = await this.prisma.association.findMany({ 
      where: { 
        isActive: true,
        ...(associationId ? { id: associationId } : {}) 
      },
      select: { id: true } 
    });

    for (const assoc of associations) {
      const balances = await this.ledger.getBalances(assoc.id);
      
      for (const [currency, amount] of Object.entries(balances.totalByCurrency)) {
        await this.prisma.balanceSnapshot.create({
          data: {
            associationId: assoc.id,
            currency: currency as CurrencyCode,
            balanceAmount: new Prisma.Decimal(amount),
            asOf: new Date(),
            generatedBy: 'SYSTEM_JOB',
          },
        });
      }
    }

    this.logger.log(`generateBalanceSnapshots: snapshots créés pour ${associations.length} associations.`);
    return { updated: associations.length };
  }

  /**
   * Détecte les membres n'ayant pas cotisé depuis plus de 3 mois.
   * 🔥 AMÉLIORATION : Cloisonnement strict par associationId.
   */
  async checkAndNotifyLateMembers(associationId?: string): Promise<{ notificationsSent: number }> {
    const thresholdDate = new Date();
    thresholdDate.setMonth(thresholdDate.getMonth() - 3);

    // Recherche des membres actifs n'ayant aucune cotisation validée récente
    const lateMembers = await this.prisma.user.findMany({
      where: {
        role: 'MEMBER',
        status: 'ACTIVE',
        ...(associationId ? { associationId } : {}), // 🔒 Cloisonnement
        contributions: {
          none: {
            status: 'VALIDATED',
            validatedAt: { gt: thresholdDate },
          },
        },
      },
      include: {
        memberships: { where: { isPrimary: true } },
      },
    });

    if (lateMembers.length === 0) return { notificationsSent: 0 };

    // Regrouper par antenne
    const antennaMap = new Map<string, string[]>();
    for (const member of lateMembers) {
      const antennaId = member.memberships[0]?.antennaId;
      if (antennaId) {
        const list = antennaMap.get(antennaId) || [];
        list.push(`${member.firstName} ${member.lastName}`);
        antennaMap.set(antennaId, list);
      }
    }

    let sent = 0;
    for (const [antennaId, members] of antennaMap.entries()) {
      // Récupérer l'associationId du premier membre du groupe (sécurité)
      const memberInAntenna = lateMembers.find(m => m.memberships[0]?.antennaId === antennaId);
      const targetAssoId = memberInAntenna?.associationId;
      
      if (targetAssoId) {
        await this.notifications.notifyAntennaAdmins(
          antennaId,
          targetAssoId,
          `Alerte : ${members.length} membres de votre antenne n'ont pas cotisé depuis plus de 3 mois.`,
          NotificationType.REMINDER_CONTRIBUTION_DELAY,
        );

        await this.prisma.reminderRunLog.create({
          data: {
            associationId: targetAssoId,
            antennaId,
            kind: ReminderKind.CONTRIBUTION_DELAY_3_MONTHS,
            thresholdMonths: 3,
            recipientsCount: members.length,
            successCount: members.length,
          }
        });
        sent++;
      }
    }

    this.logger.log(`checkAndNotifyLateMembers: ${sent} alertes envoyées.`);
    return { notificationsSent: sent };
  }
}