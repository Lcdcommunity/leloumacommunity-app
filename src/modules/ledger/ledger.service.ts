//src/modules/ledger/ledger.service.ts
import { Injectable } from '@nestjs/common';
import { LedgerEntryType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { toNumberDecimal } from '../../common/utils/decimal.util';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalances(associationId: string, antennaId?: string) {
    const rows = await this.prisma.ledgerEntry.findMany({
      where: { associationId, antennaId: antennaId ?? undefined },
      select: { type: true, amount: true, currency: true },
    });

    const signByType: Record<string, number> = {
      CONTRIBUTION_IN: 1,
      DONATION_IN: 1,
      MANUAL_ADJUSTMENT_IN: 1,
      PROJECT_EXPENSE_OUT: -1,
      OPERATING_EXPENSE_OUT: -1,
      MANUAL_ADJUSTMENT_OUT: -1,
    };

    const totalByCurrency = rows.reduce<Record<string, number>>((acc, row) => {
      const sign = signByType[row.type] ?? 1;
      const amount = toNumberDecimal(row.amount);
      acc[row.currency] = (acc[row.currency] ?? 0) + sign * amount;
      return acc;
    }, {});

    return { associationId, antennaId: antennaId ?? null, totalByCurrency };
  }
}