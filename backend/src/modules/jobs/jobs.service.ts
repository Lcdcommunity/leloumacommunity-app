// backend/src/modules/jobs/jobs.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LedgerService } from '../ledger/ledger.service';
import { NotificationType, ReminderKind } from '@prisma/client';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly ledger: LedgerService,
  ) {}

  /**
   * Purge les tokens d'authentification (email, password reset) expirés ou consommés.
   * Basé sur le modèle AuthToken du schéma.
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
   * Recalcule les soldes et génère des snapshots (BalanceSnapshot) pour le reporting.
   */
  async generateBalanceSnapshots(): Promise<{ updated: number }> {
    const associations = await this.prisma.association.findMany({ 
      where: { isActive: true },
      select: { id: true } 
    });

    for (const assoc of associations) {
      const balances = await this.ledger.getBalances(assoc.id);
      
      for (const [currency, amount] of Object.entries(balances.totalByCurrency)) {
        await this.prisma.balanceSnapshot.create({
          data: {
            associationId: assoc.id,
            currency: currency as any,
            balanceAmount: amount as any,
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
   * ✅ NOUVEAU JOB : Détecte les membres n'ayant pas cotisé depuis plus de 3 mois
   * et envoie une notification automatique aux Admins d'antenne.
   */
  async checkAndNotifyLateMembers(): Promise<{ notificationsSent: number }> {
    const thresholdDate = new Date();
    thresholdDate.setMonth(thresholdDate.getMonth() - 3);

    // On cherche les membres actifs dont la dernière cotisation validée est ancienne
    const lateMembers = await this.prisma.user.findMany({
      where: {
        role: 'MEMBER',
        status: 'ACTIVE',
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

    // Regrouper par antenne pour ne pas spammer les admins
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
      const associationId = lateMembers.find(m => m.memberships[0]?.antennaId === antennaId)?.associationId;
      
      if (associationId) {
        await this.notifications.notifyAntennaAdmins(
          antennaId,
          associationId,
          `Alerte : ${members.length} membres de votre antenne n'ont pas cotisé depuis plus de 3 mois.`,
          NotificationType.REMINDER_CONTRIBUTION_DELAY,
        );

        // Log de l'opération dans ReminderRunLog (comme prévu dans ton schéma)
        await this.prisma.reminderRunLog.create({
          data: {
            associationId,
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

    this.logger.log(`checkAndNotifyLateMembers: ${sent} alertes envoyées aux antennes.`);
    return { notificationsSent: sent };
  }
}