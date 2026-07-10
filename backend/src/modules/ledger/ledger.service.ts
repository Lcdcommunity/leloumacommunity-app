// backend/src/modules/ledger/ledger.service.ts
import { Injectable } from '@nestjs/common';
import { LedgerEntryType, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toNumberDecimal } from '../../common/utils/decimal.util';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService, // Injecté chirurgicalement
  ) {}

  /**
   * Calcule les soldes par devise pour une association ou une antenne spécifique
   */
  async getBalances(associationId: string, antennaId?: string) {
    const rows = await this.prisma.ledgerEntry.findMany({
      where: { associationId, antennaId: antennaId ?? undefined },
      select: { type: true, amount: true, currency: true },
    });

    // 🔥 CORRECTION CRITIQUE : Record<LedgerEntryType, number> au lieu de
    // Record<string, number>. TypeScript exige maintenant TOUS les membres
    // de l'enum — impossible qu'un type oublié retombe silencieusement sur
    // +1 via un `?? 1`. C'est exactement ce qui s'est passé pour
    // TRANSFER_OUT : il gonflait le solde de l'antenne expéditrice au lieu
    // de le réduire.
    const signByType: Record<LedgerEntryType, number> = {
      CONTRIBUTION_IN: 1,
      DONATION_IN: 1,
      MANUAL_ADJUSTMENT_IN: 1,
      TRANSFER_IN: 1,
      ANTENNA_EXPENSE_OUT: -1,
      PROJECT_EXPENSE_OUT: -1,
      OPERATING_EXPENSE_OUT: -1,
      MANUAL_ADJUSTMENT_OUT: -1,
      TRANSFER_OUT: -1,
    };

    const totalByCurrency = rows.reduce<Record<string, number>>((acc, row) => {
      const sign = signByType[row.type];
      const amount = toNumberDecimal(row.amount);
      acc[row.currency] = (acc[row.currency] ?? 0) + sign * amount;
      return acc;
    }, {});

    return { associationId, antennaId: antennaId ?? null, totalByCurrency };
  }

  /**
   * ✅ MÉTHODE AJOUTÉE : Crée une entrée comptable et notifie les Super Admins 
   * pour les ajustements manuels ou les dépenses importantes.
   */
  async createEntry(data: Prisma.LedgerEntryUncheckedCreateInput) {
    const entry = await this.prisma.ledgerEntry.create({ data });

    // ✅ NOTIFICATION : Alerter la direction pour les mouvements manuels ou les sorties d'argent
    const sensitiveTypes: LedgerEntryType[] = [
      LedgerEntryType.MANUAL_ADJUSTMENT_IN,
      LedgerEntryType.MANUAL_ADJUSTMENT_OUT,
      LedgerEntryType.ANTENNA_EXPENSE_OUT,
      LedgerEntryType.PROJECT_EXPENSE_OUT,
      LedgerEntryType.OPERATING_EXPENSE_OUT,
    ];

    if (sensitiveTypes.includes(entry.type)) {
      await this.notifications.notifySuperAdmins(
        entry.associationId,
        `Mouvement comptable (${entry.type}) : ${entry.title} pour un montant de ${entry.amount} ${entry.currency}.`,
        NotificationType.SYSTEM_ALERT,
      );
    }

    return entry;
  }
}