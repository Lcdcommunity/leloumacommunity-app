// backend/src/modules/platform-wallet/platform-wallet.spec.ts
//
// Wallet plateforme + virements de commission : rôles, DTO, solde signé, cycle de vie complet
// (création → validation / refus / annulation), atomicité, double validation, idempotence.
// Base simulée en mémoire avec ROLLBACK des transactions (pas de moteur Prisma requis).
import 'reflect-metadata';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LedgerEntryType, Prisma, UserRole } from '@prisma/client';

import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { LedgerService } from '../ledger/ledger.service';
import { PlatformTransfersController } from './platform-transfers.controller';
import { PlatformTransfersService } from './platform-transfers.service';
import { PlatformWalletController } from './platform-wallet.controller';
import { PlatformWalletService } from './platform-wallet.service';
import { LEDGER_SIGN, WALLET_SIGN } from './platform-wallet.constants';
import { newReference, toMoney } from './platform-wallet.helpers';
import { CreatePlatformTransferDto, CreateWalletMovementDto, RejectPlatformTransferDto } from './dto/platform-wallet.dto';

const D = (n: number | string) => new Prisma.Decimal(n);

// ───────────────────────── Fausse base en mémoire ─────────────────────────
function matches(row: any, where: any = {}): boolean {
  return Object.entries(where).every(([k, v]: [string, any]) => {
    if (k === 'AND') return (v as any[]).every((w) => matches(row, w));
    if (k === 'OR') return (v as any[]).some((w) => matches(row, w));
    if (v && typeof v === 'object' && !(v instanceof Date) && !Prisma.Decimal.isDecimal(v)) {
      if ('in' in v) return v.in.includes(row[k]);
      if ('not' in v) return row[k] !== v.not;
      if ('contains' in v) return String(row[k] ?? '').toLowerCase().includes(String(v.contains).toLowerCase());
      if ('gte' in v || 'lte' in v) return (v.gte === undefined || row[k] >= v.gte) && (v.lte === undefined || row[k] <= v.lte);
      return matches(row[k] ?? {}, v);
    }
    return row[k] === v;
  });
}

function clone(v: any): any {
  if (Prisma.Decimal.isDecimal(v)) return new Prisma.Decimal(v.toString());
  if (v instanceof Date) return new Date(v.getTime());
  if (Array.isArray(v)) return v.map(clone);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clone(x)]));
  return v;
}

function makeDb(seed: { ledger?: any[]; assignments?: any[]; settings?: any } = {}) {
  let n = 0;
  let queue: Promise<unknown> = Promise.resolve();
  const state: any = {
    ledger: [...(seed.ledger ?? [])],
    transfers: [] as any[],
    wallet: [] as any[],
    audit: [] as any[],
    settings: seed.settings ?? null,
  };
  const id = (p: string) => `${p}${++n}`;
  const groupBy = (rows: any[]) => async ({ by, where, _sum, _count }: any) => {
    const groups = new Map<string, any>();
    for (const r of rows.filter((x) => matches(x, where))) {
      const key = by.map((f: string) => r[f]).join('|');
      const g = groups.get(key) ?? { ...Object.fromEntries(by.map((f: string) => [f, r[f]])), _sum: { amount: D(0) }, _count: { _all: 0 } };
      g._sum.amount = g._sum.amount.add(r.amount);
      g._count._all++;
      groups.set(key, g);
    }
    return [...groups.values()];
  };
  const aggregate = (rows: any[]) => async ({ where }: any) => ({
    _sum: { amount: rows.filter((x) => matches(x, where)).reduce((a, r) => a.add(r.amount), D(0)) },
  });

  const db: any = {
    _state: state,
    $executeRaw: jest.fn().mockResolvedValue(0),
    user: { findUnique: jest.fn(async ({ where }: any) => ({ id: where.id, firstName: 'Awa', lastName: 'Diallo', associationId: 'as1' })) },
    antennaAdminAssignment: {
      findMany: jest.fn(async ({ where }: any) =>
        (seed.assignments ?? []).filter((a) => a.adminUserId === where.adminUserId && a.isActive !== false),
      ),
    },
    antenna: { findMany: jest.fn().mockResolvedValue([]) },
    association: { findMany: jest.fn().mockResolvedValue([{ id: 'as1', name: 'Association Un' }]) },
    platformSetting: {
      findUnique: jest.fn(async () => state.settings),
      upsert: jest.fn(async ({ update }: any) => (state.settings = { ...(state.settings ?? {}), ...update })),
    },
    ledgerEntry: {
      get groupBy() { return groupBy(state.ledger); },
      create: jest.fn(async ({ data }: any) => { const r = { id: id('le'), ...data }; state.ledger.push(r); return r; }),
    },
    platformTransfer: {
      create: jest.fn(async ({ data }: any) => {
        if (data.idempotencyKey && state.transfers.some((t: any) => t.initiatedByUserId === data.initiatedByUserId && t.idempotencyKey === data.idempotencyKey)) {
          throw new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 't', meta: { target: ['idempotencyKey'] } });
        }
        const r = { id: id('pt'), status: 'PENDING_VALIDATION', purpose: 'COMMISSION', createdAt: new Date(), validatedAt: null, rejectedAt: null, cancelledAt: null, rejectionReason: null, senderLedgerEntryId: null, walletEntryId: null, ...data };
        state.transfers.push(r);
        return r;
      }),
      findUnique: jest.fn(async ({ where }: any) => {
        if (where.initiatedByUserId_idempotencyKey) {
          const w = where.initiatedByUserId_idempotencyKey;
          return state.transfers.find((t: any) => t.initiatedByUserId === w.initiatedByUserId && t.idempotencyKey === w.idempotencyKey) ?? null;
        }
        return state.transfers.find((t: any) => t.id === where.id) ?? null;
      }),
      findUniqueOrThrow: jest.fn(async ({ where }: any) => state.transfers.find((t: any) => t.id === where.id)),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const rows = state.transfers.filter((t: any) => matches(t, where));
        rows.forEach((r: any) => Object.assign(r, data));
        return { count: rows.length };
      }),
      update: jest.fn(async ({ where, data }: any) => Object.assign(state.transfers.find((t: any) => t.id === where.id), data)),
      get groupBy() { return groupBy(state.transfers); },
      get aggregate() { return aggregate(state.transfers); },
      count: jest.fn(async ({ where }: any) => state.transfers.filter((t: any) => matches(t, where)).length),
      findMany: jest.fn(async ({ where }: any) => state.transfers.filter((t: any) => matches(t, where))),
    },
    platformWalletEntry: {
      create: jest.fn(async ({ data }: any) => {
        if (data.idempotencyKey && state.wallet.some((w: any) => w.idempotencyKey === data.idempotencyKey)) {
          throw new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 't', meta: { target: ['idempotencyKey'] } });
        }
        const r = { id: id('we'), createdAt: new Date(), effectiveDate: new Date(), description: null, referenceCode: null, associationId: null, ...data };
        state.wallet.push(r);
        return r;
      }),
      findUnique: jest.fn(async ({ where }: any) => state.wallet.find((w: any) => w.idempotencyKey === where.idempotencyKey) ?? null),
      get groupBy() { return groupBy(state.wallet); },
      findMany: jest.fn(async () => [...state.wallet]),
      count: jest.fn(async () => state.wallet.length),
    },
    auditLog: { create: jest.fn(async ({ data }: any) => { state.audit.push(data); return data; }) },
    // Transaction avec ROLLBACK, sérialisée (simule le verrou consultatif + l'isolation de Postgres).
    $transaction: jest.fn((fn: any) => {
      const run = async () => {
        const snap = clone(state);
        try {
          return await fn(db);
        } catch (e) {
          const back = clone(snap);
          for (const k of Object.keys(state)) state[k] = back[k];
          throw e;
        }
      };
      const p = queue.then(run, run);
      queue = p.catch(() => undefined);
      return p;
    }),
  };
  return db;
}

const ANT = { id: 'an1', name: 'Antenne Paris', city: 'Paris', associationId: 'as1', association: { name: 'Association Un' }, isActive: true };
const assign = (userId: string, antenna: any = ANT) => ({ adminUserId: userId, antennaId: antenna.id, isActive: true, antenna });
const ledger = (type: LedgerEntryType, amount: number, currency = 'EUR', antennaId = 'an1') => ({ id: `l-${Math.random()}`, associationId: 'as1', antennaId, type, amount: D(amount), currency });

function make(opts: { ledger?: any[]; assignments?: any[]; settings?: any } = {}) {
  const prisma = makeDb({ assignments: [assign('u-admin')], ...opts });
  const notifications: any = {
    notifySystemAdmins: jest.fn().mockResolvedValue(undefined),
    notifySuperAdmins: jest.fn().mockResolvedValue(undefined),
    createForUser: jest.fn().mockResolvedValue({ id: 'n1' }),
  };
  const wallet = new PlatformWalletService(prisma);
  const transfers = new PlatformTransfersService(prisma, notifications, wallet);
  return { prisma, notifications, wallet, transfers, state: prisma._state };
}
const antennaAdmin = { id: 'u-admin', role: UserRole.ANTENNA_ADMIN };
const superAdmin = { id: 'u-super', role: UserRole.SUPER_ADMIN };
const grandChef = { id: 'u-gc', role: UserRole.SYSTEM_ADMIN };
const dto = (over: any = {}): any => ({ currency: 'EUR', amount: 100, ...over });

// ───────────────────────── Tests ─────────────────────────

describe('Rôles', () => {
  const roles = (cls: any, fn?: string) => Reflect.getMetadata(ROLES_KEY, fn ? cls.prototype[fn] : cls);
  it("seul l'admin d'antenne peut créer / annuler ; le super admin lit seulement", () => {
    expect(roles(PlatformTransfersController, 'create')).toEqual([UserRole.ANTENNA_ADMIN]);
    expect(roles(PlatformTransfersController, 'cancel')).toEqual([UserRole.ANTENNA_ADMIN]);
    expect(roles(PlatformTransfersController, 'list')).toEqual([UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN]);
    expect(roles(PlatformTransfersController, 'options')).toEqual([UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN]);
  });
  it('toute la console wallet est réservée au SYSTEM_ADMIN', () => {
    expect(roles(PlatformWalletController)).toEqual([UserRole.SYSTEM_ADMIN]);
  });
  it('le service refuse aussi le super admin à la création (défense en profondeur)', async () => {
    const { transfers } = make();
    await expect(transfers.create(superAdmin, dto())).rejects.toBeInstanceOf(ForbiddenException);
    await expect(transfers.cancel(superAdmin, 'x')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('Sens des écritures', () => {
  it('LEDGER_SIGN reste identique à LedgerService.getBalances (anti-dérive)', async () => {
    const types = Object.keys(LEDGER_SIGN) as LedgerEntryType[];
    const rows = types.map((type, i) => ({ type, amount: D(10 * (i + 1)), currency: 'EUR' }));
    const svc = new LedgerService({ ledgerEntry: { findMany: jest.fn().mockResolvedValue(rows) } } as any, {} as any);
    const { totalByCurrency } = await svc.getBalances('as1');
    const expected = rows.reduce((a, r) => a + LEDGER_SIGN[r.type] * Number(r.amount), 0);
    expect(totalByCurrency.EUR).toBe(expected);
    expect(Object.keys(LEDGER_SIGN).sort()).toEqual(Object.values(LedgerEntryType).sort());
  });
  it('WALLET_SIGN : entrées positives, sorties négatives', () => {
    expect(WALLET_SIGN).toEqual({ COMMISSION_IN: 1, ADJUSTMENT_IN: 1, ADJUSTMENT_OUT: -1, WITHDRAWAL_OUT: -1 });
  });
});

describe('Montants et références', () => {
  it('toMoney refuse 0, négatif, NaN, 3 décimales, énorme ; accepte « 12,5 »', () => {
    for (const bad of [0, -1, NaN, Infinity, 1.234, 1e15, 'abc', null, undefined]) {
      expect(() => toMoney(bad)).toThrow(BadRequestException);
    }
    expect(toMoney('12,5').toFixed(2)).toBe('12.50');
    expect(toMoney(0.1).toFixed(2)).toBe('0.10');
  });
  it('newReference : PT-AAAAMMJJ-XXXXXX, sans caractères ambigus', () => {
    const refs = new Set(Array.from({ length: 200 }, () => newReference(new Date('2026-10-13T10:00:00Z'))));
    expect(refs.size).toBeGreaterThan(190);
    for (const r of refs) expect(r).toMatch(/^PT-20261013-[A-HJ-NP-Z2-9]{6}$/);
  });
});

describe('DTO', () => {
  const pipe = { whitelist: true, forbidNonWhitelisted: true };
  const errs = async (cls: any, o: object) => (await validate(plainToInstance(cls, o), pipe)).map((e) => e.property);
  it('création : devise en minuscules acceptée, 3 décimales / négatif / champ inconnu refusés', async () => {
    expect(await errs(CreatePlatformTransferDto, { currency: 'eur', amount: 10 })).toEqual([]);
    expect(await errs(CreatePlatformTransferDto, { currency: 'EUR', amount: 10.123 })).toContain('amount');
    expect(await errs(CreatePlatformTransferDto, { currency: 'EUR', amount: -3 })).toContain('amount');
    expect(await errs(CreatePlatformTransferDto, { currency: 'EUR', amount: 1e15 })).toContain('amount');
    expect(await errs(CreatePlatformTransferDto, { currency: 'ABC', amount: 5 })).toContain('currency');
    expect(await errs(CreatePlatformTransferDto, { currency: 'EUR', amount: 5, status: 'VALIDATED' })).toContain('status');
  });
  it('refus : motif obligatoire (3 caractères mini)', async () => {
    expect(await errs(RejectPlatformTransferDto, { reason: 'x' })).toContain('reason');
    expect(await errs(RejectPlatformTransferDto, { reason: '   ' })).toContain('reason');
    expect(await errs(RejectPlatformTransferDto, { reason: 'Montant erroné' })).toEqual([]);
  });
  it('mouvement manuel : COMMISSION_IN ne peut pas être saisi à la main', async () => {
    const base = { currency: 'EUR', amount: 5, title: 'Retrait banque' };
    expect(await errs(CreateWalletMovementDto, { ...base, type: 'COMMISSION_IN' })).toContain('type');
    expect(await errs(CreateWalletMovementDto, { ...base, type: 'WITHDRAWAL_OUT' })).toEqual([]);
  });
});

describe('Création par l’admin d’antenne', () => {
  it('crée un virement EN ATTENTE, trace l’audit, prévient le Grand Chef, ne touche PAS au ledger', async () => {
    const { transfers, state, notifications } = make({ ledger: [ledger('CONTRIBUTION_IN', 500)] });
    const t = await transfers.create(antennaAdmin, dto({ amount: 120.5, periodLabel: 'Septembre 2026' }));
    expect(t.status).toBe('PENDING_VALIDATION');
    expect(t.amount).toBe('120.50');
    expect(t.reference).toMatch(/^PT-\d{8}-[A-Z2-9]{6}$/);
    expect(t.associationName).toBe('Association Un');
    expect(state.ledger).toHaveLength(1); // aucune écriture de ledger avant validation
    expect(state.wallet).toHaveLength(0);
    expect(state.audit.map((a: any) => a.action)).toEqual(['CREATE_PLATFORM_TRANSFER']);
    expect(notifications.notifySystemAdmins).toHaveBeenCalledTimes(1);
  });

  it('refuse un solde insuffisant, en tenant compte des virements déjà en attente', async () => {
    const { transfers, state } = make({ ledger: [ledger('CONTRIBUTION_IN', 100)] });
    await transfers.create(antennaAdmin, dto({ amount: 70 }));
    await expect(transfers.create(antennaAdmin, dto({ amount: 40 }))).rejects.toThrow(/Solde insuffisant/);
    expect(state.transfers).toHaveLength(1);
    await expect(transfers.create(antennaAdmin, dto({ amount: 30 }))).resolves.toBeDefined(); // 70 + 30 = 100 : pile le solde
  });

  it('le solde d’une devise ne couvre pas une autre devise', async () => {
    const { transfers } = make({ ledger: [ledger('CONTRIBUTION_IN', 1000, 'EUR')] });
    await expect(transfers.create(antennaAdmin, dto({ currency: 'XOF', amount: 1 }))).rejects.toThrow(/Solde insuffisant/);
  });

  it('les sorties (dépenses, virements) viennent en déduction du solde', async () => {
    const { transfers } = make({ ledger: [ledger('CONTRIBUTION_IN', 100), ledger('ANTENNA_EXPENSE_OUT', 60), ledger('TRANSFER_OUT', 10)] });
    await expect(transfers.create(antennaAdmin, dto({ amount: 31 }))).rejects.toThrow(/Solde insuffisant/);
    await expect(transfers.create(antennaAdmin, dto({ amount: 30 }))).resolves.toBeDefined();
  });

  it('refuse une devise inactive dans le wallet (paramétrable)', async () => {
    const { transfers } = make({ ledger: [ledger('CONTRIBUTION_IN', 100, 'GBP')], settings: { platformWalletCurrencies: ['EUR', 'USD'] } });
    await expect(transfers.create(antennaAdmin, dto({ currency: 'GBP', amount: 1 }))).rejects.toThrow(/n'est pas acceptée/);
  });

  it('plusieurs antennes ⇒ senderAntennaId obligatoire ; antenne étrangère ⇒ 403', async () => {
    const an2 = { ...ANT, id: 'an2', name: 'Antenne Lyon' };
    const { transfers } = make({
      ledger: [ledger('CONTRIBUTION_IN', 100), ledger('CONTRIBUTION_IN', 100, 'EUR', 'an2')],
      assignments: [assign('u-admin'), assign('u-admin', an2)],
    });
    await expect(transfers.create(antennaAdmin, dto({ amount: 10 }))).rejects.toThrow(/plusieurs antennes/);
    await expect(transfers.create(antennaAdmin, dto({ amount: 10, senderAntennaId: 'autre' }))).rejects.toBeInstanceOf(ForbiddenException);
    const t = await transfers.create(antennaAdmin, dto({ amount: 10, senderAntennaId: 'an2' }));
    expect(t.senderAntennaName).toBe('Antenne Lyon');
  });

  it('un admin sans affectation active est refusé', async () => {
    const { transfers } = make({ assignments: [] });
    await expect(transfers.create(antennaAdmin, dto())).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('idempotence : rejouer la même clé renvoie le même virement, sans doublon', async () => {
    const { transfers, state } = make({ ledger: [ledger('CONTRIBUTION_IN', 500)] });
    const a = await transfers.create(antennaAdmin, dto({ idempotencyKey: 'key-12345678' }));
    const b: any = await transfers.create(antennaAdmin, dto({ idempotencyKey: 'key-12345678' }));
    expect(b.id).toBe(a.id);
    expect(b.replayed).toBe(true);
    expect(state.transfers).toHaveLength(1);
  });

  it('une panne de notification n’empêche pas la création', async () => {
    const { transfers, notifications, state } = make({ ledger: [ledger('CONTRIBUTION_IN', 500)] });
    notifications.notifySystemAdmins.mockRejectedValue(new Error('push down'));
    await expect(transfers.create(antennaAdmin, dto())).resolves.toBeDefined();
    expect(state.transfers).toHaveLength(1);
  });
});

describe('Validation par le Grand Chef', () => {
  async function pending(amount = 100, seed = 500) {
    const ctx = make({ ledger: [ledger('CONTRIBUTION_IN', seed)] });
    const t = await ctx.transfers.create(antennaAdmin, dto({ amount }));
    return { ...ctx, t };
  }

  it('écrit TRANSFER_OUT (antenne) + COMMISSION_IN (wallet) avec la même référence, dans la même opération', async () => {
    const { transfers, state, t, wallet } = await pending(100);
    const v = await transfers.validate(grandChef, t.id);
    expect(v.status).toBe('VALIDATED');

    const out = state.ledger.find((l: any) => l.type === 'TRANSFER_OUT');
    expect(out).toMatchObject({ associationId: 'as1', antennaId: 'an1', currency: 'EUR', referenceCode: t.reference });
    expect(out.amount.toFixed(2)).toBe('100.00');

    expect(state.wallet).toHaveLength(1);
    expect(state.wallet[0]).toMatchObject({ type: 'COMMISSION_IN', currency: 'EUR', referenceCode: t.reference, associationId: 'as1' });

    const stored = state.transfers[0];
    expect(stored.senderLedgerEntryId).toBe(out.id);
    expect(stored.walletEntryId).toBe(state.wallet[0].id);
    expect(state.audit.map((a: any) => a.action)).toEqual(['CREATE_PLATFORM_TRANSFER', 'VALIDATE_PLATFORM_TRANSFER']);

    const ov = await wallet.overview();
    expect(ov.wallets.find((w) => w.currency === 'EUR')).toMatchObject({ balance: '100.00', received: '100.00', pendingCount: 0 });
    expect(ov.wallets.map((w) => w.currency)).toEqual(['EUR', 'USD', 'GNF', 'XOF']); // les 4 devises, toujours
  });

  it('double validation : la 2e est refusée (409) et ne crée aucune écriture en plus', async () => {
    const { transfers, state, t } = await pending(100);
    await transfers.validate(grandChef, t.id);
    await expect(transfers.validate(grandChef, t.id)).rejects.toBeInstanceOf(ConflictException);
    expect(state.ledger.filter((l: any) => l.type === 'TRANSFER_OUT')).toHaveLength(1);
    expect(state.wallet).toHaveLength(1);
  });

  it('deux validations simultanées : une seule passe', async () => {
    const { transfers, state, t } = await pending(100);
    const res = await Promise.allSettled([transfers.validate(grandChef, t.id), transfers.validate(grandChef, t.id)]);
    expect(res.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(state.wallet).toHaveLength(1);
    expect(state.ledger.filter((l: any) => l.type === 'TRANSFER_OUT')).toHaveLength(1);
  });

  it('solde de l’antenne tombé entre-temps : 409, ROLLBACK complet (reste en attente, rien d’écrit)', async () => {
    const { transfers, state, t } = await pending(100, 150);
    state.ledger.push(ledger('ANTENNA_EXPENSE_OUT', 100)); // dépense validée après la demande : reste 50 < 100
    await expect(transfers.validate(grandChef, t.id)).rejects.toThrow(/Solde insuffisant/);
    expect(state.transfers[0].status).toBe('PENDING_VALIDATION');
    expect(state.transfers[0].validatedAt).toBeNull();
    expect(state.wallet).toHaveLength(0);
    expect(state.ledger.filter((l: any) => l.type === 'TRANSFER_OUT')).toHaveLength(0);
  });

  it('prend le verrou de l’antenne+devise avant de lire le solde', async () => {
    const { transfers, prisma, t } = await pending(10);
    prisma.$executeRaw.mockClear();
    await transfers.validate(grandChef, t.id);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
  });

  it('virement inconnu → 404 ; notifie l’expéditeur et les super admins, sans bloquer si la notification échoue', async () => {
    const { transfers, notifications, t } = await pending(10);
    await expect(transfers.validate(grandChef, 'nope')).rejects.toThrow(/introuvable/);
    notifications.createForUser.mockRejectedValue(new Error('x'));
    await expect(transfers.validate(grandChef, t.id)).resolves.toMatchObject({ status: 'VALIDATED' });
  });
});

describe('Refus et annulation', () => {
  it('refus : motif enregistré, aucune écriture d’argent, revalidation impossible', async () => {
    const ctx = make({ ledger: [ledger('CONTRIBUTION_IN', 500)] });
    const t = await ctx.transfers.create(antennaAdmin, dto({ amount: 50 }));
    const r = await ctx.transfers.reject(grandChef, t.id, 'Montant erroné');
    expect(r).toMatchObject({ status: 'REJECTED', rejectionReason: 'Montant erroné' });
    expect(ctx.state.wallet).toHaveLength(0);
    expect(ctx.state.ledger).toHaveLength(1);
    await expect(ctx.transfers.validate(grandChef, t.id)).rejects.toBeInstanceOf(ConflictException);
    await expect(ctx.transfers.reject(grandChef, t.id, 'encore')).rejects.toBeInstanceOf(ConflictException);
  });

  it('le montant d’un virement refusé est de nouveau disponible', async () => {
    const ctx = make({ ledger: [ledger('CONTRIBUTION_IN', 100)] });
    const t = await ctx.transfers.create(antennaAdmin, dto({ amount: 100 }));
    await expect(ctx.transfers.create(antennaAdmin, dto({ amount: 1 }))).rejects.toThrow(/Solde insuffisant/);
    await ctx.transfers.reject(grandChef, t.id, 'Refus test');
    await expect(ctx.transfers.create(antennaAdmin, dto({ amount: 100 }))).resolves.toBeDefined();
  });

  it('annulation par l’expéditeur tant que c’est en attente ; impossible après validation', async () => {
    const ctx = make({ ledger: [ledger('CONTRIBUTION_IN', 500)] });
    const t1 = await ctx.transfers.create(antennaAdmin, dto({ amount: 10 }));
    await ctx.transfers.cancel(antennaAdmin, t1.id);
    expect(ctx.state.transfers[0].status).toBe('CANCELLED');
    await expect(ctx.transfers.validate(grandChef, t1.id)).rejects.toBeInstanceOf(ConflictException);

    const t2 = await ctx.transfers.create(antennaAdmin, dto({ amount: 10 }));
    await ctx.transfers.validate(grandChef, t2.id);
    await expect(ctx.transfers.cancel(antennaAdmin, t2.id)).rejects.toBeInstanceOf(ConflictException);
  });

  it('un admin d’une autre antenne ne peut pas annuler', async () => {
    const ctx = make({ ledger: [ledger('CONTRIBUTION_IN', 500)], assignments: [assign('u-admin'), assign('u-other', { ...ANT, id: 'an9' })] });
    const t = await ctx.transfers.create(antennaAdmin, dto({ amount: 10 }));
    await expect(ctx.transfers.cancel({ id: 'u-other', role: UserRole.ANTENNA_ADMIN }, t.id)).rejects.toBeInstanceOf(ForbiddenException);
    expect(ctx.state.transfers[0].status).toBe('PENDING_VALIDATION');
  });
});

describe('Lecture (périmètre)', () => {
  it('l’admin d’antenne ne voit que ses antennes ; le super admin voit son association', async () => {
    const ctx = make({ ledger: [ledger('CONTRIBUTION_IN', 500)] });
    await ctx.transfers.create(antennaAdmin, dto({ amount: 10 }));
    ctx.state.transfers.push({ ...ctx.state.transfers[0], id: 'etranger', senderAntennaId: 'an-autre', associationId: 'as2' });
    const mine = await ctx.transfers.listMine(antennaAdmin, {});
    expect(mine.items.map((i) => i.senderAntennaId)).toEqual(['an1']);
    const sup = await ctx.transfers.listMine(superAdmin, {});
    expect(sup.items.every((i) => i.associationId === 'as1')).toBe(true);
    await expect(ctx.transfers.listMine({ id: 'm', role: UserRole.MEMBER }, {})).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('options : disponible = solde − engagé, par devise active', async () => {
    const ctx = make({ ledger: [ledger('CONTRIBUTION_IN', 300), ledger('CONTRIBUTION_IN', 5000, 'XOF')] });
    await ctx.transfers.create(antennaAdmin, dto({ amount: 120 }));
    const o: any = await ctx.transfers.options(antennaAdmin);
    expect(o.canSend).toBe(true);
    expect(o.currencies).toEqual(['EUR', 'USD', 'GNF', 'XOF']);
    const eur = o.antennas[0].balances.find((b: any) => b.currency === 'EUR');
    expect(eur).toEqual({ currency: 'EUR', balance: '300.00', reserved: '120.00', available: '180.00' });
    expect(o.antennas[0].balances.find((b: any) => b.currency === 'XOF').available).toBe('5000.00');
  });
});

describe('Mouvements manuels du wallet', () => {
  async function funded() {
    const ctx = make({ ledger: [ledger('CONTRIBUTION_IN', 500)] });
    const t = await ctx.transfers.create(antennaAdmin, dto({ amount: 200 }));
    await ctx.transfers.validate(grandChef, t.id);
    return ctx;
  }
  const mv = (over: any = {}): any => ({ type: 'WITHDRAWAL_OUT', currency: 'EUR', amount: 50, title: 'Virement vers ma banque', ...over });

  it('retrait : débite le wallet, jamais en dessous de zéro', async () => {
    const { wallet } = await funded();
    await wallet.createMovement(grandChef.id, mv({ amount: 150 }));
    expect((await wallet.overview()).wallets.find((w) => w.currency === 'EUR')).toMatchObject({ balance: '50.00', withdrawn: '150.00' });
    await expect(wallet.createMovement(grandChef.id, mv({ amount: 50.01 }))).rejects.toThrow(/Solde insuffisant/);
  });

  it('un retrait refusé laisse le wallet intact (rollback) ; ajustement entrant autorisé', async () => {
    const { wallet, state } = await funded();
    const before = state.wallet.length;
    await expect(wallet.createMovement(grandChef.id, mv({ amount: 9999 }))).rejects.toBeInstanceOf(BadRequestException);
    expect(state.wallet).toHaveLength(before);
    await wallet.createMovement(grandChef.id, mv({ type: 'ADJUSTMENT_IN', amount: 5, title: 'Correction' }));
    expect((await wallet.overview()).wallets.find((w) => w.currency === 'EUR').balance).toBe('205.00');
  });

  it('idempotence du mouvement ; devise inactive refusée ; date future refusée', async () => {
    const { wallet, state } = await funded();
    const a: any = await wallet.createMovement(grandChef.id, mv({ idempotencyKey: 'mv-key-1234' }));
    const b: any = await wallet.createMovement(grandChef.id, mv({ idempotencyKey: 'mv-key-1234' }));
    expect(b.id).toBe(a.id);
    expect(state.wallet.filter((w: any) => w.type === 'WITHDRAWAL_OUT')).toHaveLength(1);
    await expect(wallet.createMovement(grandChef.id, mv({ currency: 'GBP' }))).rejects.toThrow(/pas active/);
    await expect(wallet.createMovement(grandChef.id, mv({ effectiveDate: '2099-01-01T00:00:00Z' }))).rejects.toThrow(/futur/);
  });

  it('retirer une devise active : refusé tant qu’elle contient de l’argent', async () => {
    const { wallet } = await funded();
    await expect(wallet.updateCurrencies(['USD', 'GNF', 'XOF'] as any, grandChef.id)).rejects.toBeInstanceOf(ConflictException);
    await expect(wallet.updateCurrencies(['EUR', 'USD', 'GNF'] as any, grandChef.id)).resolves.toEqual({ currencies: ['EUR', 'USD', 'GNF'] });
  });
});
