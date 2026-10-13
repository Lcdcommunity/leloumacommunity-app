// backend/src/modules/platform-wallet/platform-wallet.service.ts
//
// v1.0 — Wallet de la plateforme (Grand Chef) : soldes par devise, historique,
//   mouvements manuels (retrait, ajustement) et devises actives.
//   Le solde est la somme SIGNÉE des écritures PlatformWalletEntry (jamais une colonne
//   stockée). Les mouvements sortants relisent le solde sous verrou avant d'écrire.
//
import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { AuditAction, CurrencyCode, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_WALLET_CURRENCIES, PLATFORM_SETTINGS_ID, WALLET_SIGN } from './platform-wallet.constants';
import {
  isUniqueViolation,
  lockKey,
  money,
  pageParams,
  toMoney,
  walletBalance,
  walletBalances,
  walletLockKey,
} from './platform-wallet.helpers';
import { CreateWalletMovementDto, ListWalletEntriesQueryDto } from './dto/platform-wallet.dto';

@Injectable()
export class PlatformWalletService {
  constructor(private readonly prisma: PrismaService) {}

  /** Devises actives du wallet (paramétrables), dans l'ordre configuré. */
  async getCurrencies(): Promise<CurrencyCode[]> {
    const s = await this.prisma.platformSetting.findUnique({
      where: { id: PLATFORM_SETTINGS_ID },
      select: { platformWalletCurrencies: true },
    });
    return s?.platformWalletCurrencies?.length ? s.platformWalletCurrencies : DEFAULT_WALLET_CURRENCIES;
  }

  async updateCurrencies(currencies: CurrencyCode[], actorUserId: string) {
    const next = Array.from(new Set(currencies));
    const current = await this.getCurrencies();
    const removed = current.filter((c) => !next.includes(c));

    for (const c of removed) {
      const bal = await walletBalance(this.prisma, c);
      if (!bal.isZero()) throw new ConflictException(`Impossible de retirer ${c} : le wallet contient encore ${money(bal)} ${c}.`);
      const pending = await this.prisma.platformTransfer.count({ where: { currency: c, status: 'PENDING_VALIDATION' } });
      if (pending > 0) throw new ConflictException(`Impossible de retirer ${c} : ${pending} virement(s) en attente dans cette devise.`);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.platformSetting.upsert({
        where: { id: PLATFORM_SETTINGS_ID },
        update: { platformWalletCurrencies: next },
        create: { id: PLATFORM_SETTINGS_ID, platformWalletCurrencies: next },
      });
      await tx.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          entity: 'PlatformWalletSettings',
          entityId: PLATFORM_SETTINGS_ID,
          details: { before: current, after: next },
          actorUserId,
        },
      });
    });
    return { currencies: next };
  }

  /** Tableau de bord du wallet : 1 carte par devise + dernières écritures + répartition par association. */
  async overview() {
    const currencies = await this.getCurrencies();
    const [balances, pendingRows, recent, bySource] = await Promise.all([
      walletBalances(this.prisma),
      this.prisma.platformTransfer.groupBy({
        by: ['currency'],
        where: { status: 'PENDING_VALIDATION' },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      this.prisma.platformWalletEntry.findMany({ orderBy: { effectiveDate: 'desc' }, take: 10 }),
      this.prisma.platformWalletEntry.groupBy({
        by: ['associationId', 'currency'],
        where: { type: 'COMMISSION_IN', associationId: { not: null } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 20,
      }),
    ]);

    // Devises avec des écritures mais retirées de la liste active : on les garde visibles (solde réel).
    const shown = Array.from(new Set<CurrencyCode>([...currencies, ...balances.keys()]));
    const wallets = shown.map((currency) => {
      const b = balances.get(currency);
      const p = pendingRows.find((r) => r.currency === currency);
      return {
        currency,
        active: currencies.includes(currency),
        balance: money(b?.balance),
        received: money(b?.received),
        withdrawn: money(b?.withdrawn),
        pendingCount: p?._count._all ?? 0,
        pendingAmount: money(p?._sum.amount),
      };
    });

    const ids = Array.from(new Set(bySource.map((r) => r.associationId!).filter(Boolean)));
    const assos = ids.length
      ? await this.prisma.association.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } })
      : [];
    const nameOf = (id: string) => assos.find((a) => a.id === id)?.name ?? 'Association supprimée';

    return {
      wallets,
      pendingTotal: pendingRows.reduce((n, r) => n + r._count._all, 0),
      recentEntries: recent.map(this.mapEntry),
      bySource: bySource.map((r) => ({
        associationId: r.associationId,
        associationName: nameOf(r.associationId!),
        currency: r.currency,
        total: money(r._sum.amount),
      })),
    };
  }

  async listEntries(q: ListWalletEntriesQueryDto) {
    const { page, pageSize, skip } = pageParams(q.page, q.pageSize);
    const where: Prisma.PlatformWalletEntryWhereInput = {
      ...(q.currency ? { currency: q.currency } : {}),
      ...(q.type && q.type in WALLET_SIGN ? { type: q.type as keyof typeof WALLET_SIGN } : {}),
      ...(q.associationId ? { associationId: q.associationId } : {}),
      ...(q.from || q.to
        ? { effectiveDate: { ...(q.from ? { gte: new Date(q.from) } : {}), ...(q.to ? { lte: new Date(q.to) } : {}) } }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.platformWalletEntry.findMany({ where, orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }], skip, take: pageSize }),
      this.prisma.platformWalletEntry.count({ where }),
    ]);
    return { items: items.map(this.mapEntry), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /** Retrait / ajustement saisi par le Grand Chef (jamais de solde négatif). */
  async createMovement(actorUserId: string, dto: CreateWalletMovementDto) {
    const currencies = await this.getCurrencies();
    if (!currencies.includes(dto.currency)) throw new BadRequestException(`La devise ${dto.currency} n'est pas active dans le wallet.`);
    const amount = toMoney(dto.amount);

    const effectiveDate = dto.effectiveDate ? new Date(dto.effectiveDate) : new Date();
    if (effectiveDate.getTime() > Date.now() + 24 * 3600 * 1000) throw new BadRequestException('La date ne peut pas être dans le futur.');

    if (dto.idempotencyKey) {
      const dup = await this.prisma.platformWalletEntry.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
      if (dup) return { ...this.mapEntry(dup), replayed: true };
    }

    try {
      const entry = await this.prisma.$transaction(
        async (tx) => {
          await lockKey(tx, walletLockKey(dto.currency));
          if (WALLET_SIGN[dto.type] === -1) {
            const bal = await walletBalance(tx, dto.currency);
            if (bal.lt(amount)) {
              throw new BadRequestException(`Solde insuffisant : ${money(bal)} ${dto.currency} disponibles.`);
            }
          }
          const created = await tx.platformWalletEntry.create({
            data: {
              type: dto.type,
              currency: dto.currency,
              amount,
              title: dto.title,
              description: dto.description ?? null,
              createdByUserId: actorUserId,
              idempotencyKey: dto.idempotencyKey ?? null,
              effectiveDate,
            },
          });
          await tx.auditLog.create({
            data: {
              action: AuditAction.PLATFORM_WALLET_MOVEMENT,
              entity: 'PlatformWalletEntry',
              entityId: created.id,
              details: { type: dto.type, currency: dto.currency, amount: amount.toFixed(2), title: dto.title },
              actorUserId,
            },
          });
          return created;
        },
        { timeout: 15000, maxWait: 5000 },
      );
      return this.mapEntry(entry);
    } catch (e) {
      if (dto.idempotencyKey && isUniqueViolation(e, 'idempotencyKey')) {
        const dup = await this.prisma.platformWalletEntry.findUnique({ where: { idempotencyKey: dto.idempotencyKey } });
        if (dup) return { ...this.mapEntry(dup), replayed: true };
      }
      throw e;
    }
  }

  mapEntry = (e: {
    id: string; type: keyof typeof WALLET_SIGN; currency: CurrencyCode; amount: Prisma.Decimal; title: string;
    description: string | null; referenceCode: string | null; associationId: string | null; effectiveDate: Date; createdAt: Date;
  }) => ({
    id: e.id,
    type: e.type,
    direction: WALLET_SIGN[e.type] === 1 ? ('IN' as const) : ('OUT' as const),
    currency: e.currency,
    amount: money(e.amount),
    signedAmount: money(e.amount.mul(WALLET_SIGN[e.type])),
    title: e.title,
    description: e.description,
    referenceCode: e.referenceCode,
    associationId: e.associationId,
    effectiveDate: e.effectiveDate.toISOString(),
    createdAt: e.createdAt.toISOString(),
  });
}
