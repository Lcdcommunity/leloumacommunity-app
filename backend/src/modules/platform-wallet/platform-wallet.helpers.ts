// backend/src/modules/platform-wallet/platform-wallet.helpers.ts
//
// v1.0 — Fonctions pures / utilitaires de base de données du wallet plateforme.
//
import { BadRequestException, ConflictException } from '@nestjs/common';
import { CurrencyCode, Prisma } from '@prisma/client';
import { randomInt } from 'crypto';
import { LEDGER_SIGN, MAX_AMOUNT, MAX_PAGE_SIZE, WALLET_SIGN } from './platform-wallet.constants';

export type Db = Prisma.TransactionClient;

const ZERO = new Prisma.Decimal(0);

/**
 * Verrou applicatif transactionnel (libéré au COMMIT/ROLLBACK). Sérialise les opérations
 * qui lisent un solde puis écrivent en fonction de ce solde. $executeRaw (et non $queryRaw) :
 * pg_advisory_xact_lock renvoie `void`, que Prisma ne sait pas désérialiser en lecture.
 * Ordre d'acquisition à respecter partout : antenne, puis wallet (jamais l'inverse).
 */
export async function lockKey(tx: Db, key: string): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}
export const antennaLockKey = (antennaId: string, currency: CurrencyCode) => `platform-transfer:antenna:${antennaId}:${currency}`;
export const walletLockKey = (currency: CurrencyCode) => `platform-wallet:${currency}`;

/** Solde signé du ledger d'une antenne pour une devise (somme signée, comme LedgerService.getBalances). */
export async function antennaBalances(db: Db, associationId: string, antennaIds: string[]) {
  const rows = await db.ledgerEntry.groupBy({
    by: ['antennaId', 'currency', 'type'],
    where: { associationId, antennaId: { in: antennaIds } },
    _sum: { amount: true },
  });
  const out = new Map<string, Prisma.Decimal>(); // `${antennaId}|${currency}`
  for (const r of rows) {
    if (!r.antennaId) continue;
    const k = `${r.antennaId}|${r.currency}`;
    const signed = (r._sum.amount ?? ZERO).mul(LEDGER_SIGN[r.type]);
    out.set(k, (out.get(k) ?? ZERO).add(signed));
  }
  return out;
}

export async function antennaBalance(db: Db, associationId: string, antennaId: string, currency: CurrencyCode) {
  const rows = await db.ledgerEntry.groupBy({
    by: ['type'],
    where: { associationId, antennaId, currency },
    _sum: { amount: true },
  });
  return rows.reduce((acc, r) => acc.add((r._sum.amount ?? ZERO).mul(LEDGER_SIGN[r.type])), ZERO);
}

/** Montant déjà engagé dans des virements en attente (pas encore passés au ledger). */
export async function pendingReserved(db: Db, antennaIds: string[]) {
  const rows = await db.platformTransfer.groupBy({
    by: ['senderAntennaId', 'currency'],
    where: { senderAntennaId: { in: antennaIds }, status: 'PENDING_VALIDATION' },
    _sum: { amount: true },
  });
  const out = new Map<string, Prisma.Decimal>();
  for (const r of rows) out.set(`${r.senderAntennaId}|${r.currency}`, r._sum.amount ?? ZERO);
  return out;
}

export async function pendingReservedFor(db: Db, antennaId: string, currency: CurrencyCode) {
  const r = await db.platformTransfer.aggregate({
    where: { senderAntennaId: antennaId, currency, status: 'PENDING_VALIDATION' },
    _sum: { amount: true },
  });
  return r._sum.amount ?? ZERO;
}

/** Soldes du wallet de la plateforme par devise (somme signée). */
export async function walletBalances(db: Db) {
  const rows = await db.platformWalletEntry.groupBy({
    by: ['currency', 'type'],
    _sum: { amount: true },
  });
  const out = new Map<CurrencyCode, { balance: Prisma.Decimal; received: Prisma.Decimal; withdrawn: Prisma.Decimal }>();
  for (const r of rows) {
    const cur = out.get(r.currency) ?? { balance: ZERO, received: ZERO, withdrawn: ZERO };
    const sum = r._sum.amount ?? ZERO;
    cur.balance = cur.balance.add(sum.mul(WALLET_SIGN[r.type]));
    if (r.type === 'COMMISSION_IN') cur.received = cur.received.add(sum);
    if (r.type === 'WITHDRAWAL_OUT') cur.withdrawn = cur.withdrawn.add(sum);
    out.set(r.currency, cur);
  }
  return out;
}

export async function walletBalance(db: Db, currency: CurrencyCode) {
  const rows = await db.platformWalletEntry.groupBy({
    by: ['type'],
    where: { currency },
    _sum: { amount: true },
  });
  return rows.reduce((acc, r) => acc.add((r._sum.amount ?? ZERO).mul(WALLET_SIGN[r.type])), ZERO);
}

/** Convertit un montant saisi en Decimal(14,2) sûr, ou lève une 400. */
export function toMoney(value: unknown): Prisma.Decimal {
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : (value as number);
  if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) throw new BadRequestException('Montant invalide.');
  if (n > MAX_AMOUNT) throw new BadRequestException('Montant trop élevé.');
  const d = new Prisma.Decimal(n);
  if (d.decimalPlaces() > 2) throw new BadRequestException('Deux décimales au maximum.');
  return d;
}

export const money = (d: Prisma.Decimal | null | undefined) => (d ?? ZERO).toFixed(2);

export function pageParams(page?: unknown, pageSize?: unknown, def = 20) {
  const p = Math.max(1, Math.floor(Number(page) || 1));
  const s = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(pageSize) || def)));
  return { page: p, pageSize: s, skip: (p - 1) * s };
}

/** Référence lisible et non devinable : PT-20261013-7K2M9Q */
export function newReference(now = new Date()): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let tail = '';
  for (let i = 0; i < 6; i++) tail += alphabet[randomInt(alphabet.length)];
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `PT-${ymd}-${tail}`;
}

export function isUniqueViolation(e: unknown, field?: string): boolean {
  if (!(e instanceof Prisma.PrismaClientKnownRequestError) || e.code !== 'P2002') return false;
  if (!field) return true;
  const target = (e.meta as { target?: unknown } | undefined)?.target;
  return Array.isArray(target) ? target.includes(field) : String(target ?? '').includes(field);
}

export function conflictFor(status: string): ConflictException {
  const label: Record<string, string> = {
    VALIDATED: 'déjà validé',
    REJECTED: 'déjà refusé',
    CANCELLED: 'déjà annulé',
  };
  return new ConflictException(`Ce virement est ${label[status] ?? 'déjà traité'}.`);
}
