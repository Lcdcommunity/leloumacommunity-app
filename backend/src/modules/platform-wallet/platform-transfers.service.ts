// backend/src/modules/platform-wallet/platform-transfers.service.ts
//
// v1.0 — Virements de commission : antenne → wallet de la plateforme (Grand Chef).
//
//   Cycle de vie (TransferStatus) :
//     création par un ADMIN D'ANTENNE → PENDING_VALIDATION (rien n'est encore débité ;
//     le montant est « réservé » : il vient en déduction du disponible de l'antenne)
//     → le GRAND CHEF valide : dans UNE transaction, sous verrou (antenne), la transition est
//       réservée par un updateMany conditionné au statut, le solde est relu, puis l'écriture
//       TRANSFER_OUT (ledger de l'antenne) et l'écriture COMMISSION_IN (wallet) sont créées ;
//     → ou refuse (motif obligatoire) ; ou l'antenne annule tant que rien n'est validé.
//   Le SUPER ADMIN de l'association a un accès en LECTURE SEULE à ces virements.
//   Chaque étape est tracée dans AuditLog ; les montants sont des Decimal (jamais de float).
//
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, CurrencyCode, LedgerEntryType, NotificationType, Prisma, TransferStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PlatformWalletService } from './platform-wallet.service';
import {
  antennaBalance,
  antennaBalances,
  antennaLockKey,
  conflictFor,
  isUniqueViolation,
  lockKey,
  money,
  newReference,
  pageParams,
  pendingReserved,
  pendingReservedFor,
  toMoney,
} from './platform-wallet.helpers';
import { CreatePlatformTransferDto, ListPlatformTransfersQueryDto } from './dto/platform-wallet.dto';

type Actor = { id: string; role: UserRole };
const TX_OPTS = { timeout: 15000, maxWait: 5000 } as const;

@Injectable()
export class PlatformTransfersService {
  private readonly logger = new Logger(PlatformTransfersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly wallet: PlatformWalletService,
  ) {}

  // ───────────────────────── Périmètre d'un admin ─────────────────────────

  /** Antennes actives dont l'utilisateur est administrateur (via ses AFFECTATIONS, jamais via Membership). */
  private async assignedAntennas(userId: string) {
    const rows = await this.prisma.antennaAdminAssignment.findMany({
      where: { adminUserId: userId, isActive: true, antenna: { isActive: true } },
      include: { antenna: { select: { id: true, name: true, city: true, associationId: true, association: { select: { name: true } } } } },
    });
    return rows.map((r) => r.antenna).filter(Boolean);
  }

  /** Périmètre de lecture : ANTENNA_ADMIN = ses antennes ; SUPER_ADMIN = son association ; (lecture seule). */
  private async readScope(actor: Actor): Promise<Prisma.PlatformTransferWhereInput> {
    if (actor.role === UserRole.SUPER_ADMIN) {
      const u = await this.prisma.user.findUnique({ where: { id: actor.id }, select: { associationId: true } });
      if (!u?.associationId) throw new ForbiddenException('Aucune association associée à ce compte.');
      return { associationId: u.associationId };
    }
    if (actor.role === UserRole.ANTENNA_ADMIN) {
      const antennas = await this.assignedAntennas(actor.id);
      if (!antennas.length) throw new ForbiddenException("Aucune antenne active n'est associée à votre compte.");
      return { senderAntennaId: { in: antennas.map((a) => a.id) } };
    }
    throw new ForbiddenException('Accès refusé.');
  }

  // ───────────────────────── Côté admin d'antenne ─────────────────────────

  /** Données du formulaire : mes antennes, devises actives et montant disponible par devise. */
  async options(actor: Actor) {
    if (actor.role !== UserRole.ANTENNA_ADMIN && actor.role !== UserRole.SUPER_ADMIN) throw new ForbiddenException('Accès refusé.');
    const currencies = await this.wallet.getCurrencies();
    const canSend = actor.role === UserRole.ANTENNA_ADMIN;

    let antennas: Awaited<ReturnType<PlatformTransfersService['assignedAntennas']>> = [];
    if (actor.role === UserRole.ANTENNA_ADMIN) antennas = await this.assignedAntennas(actor.id);
    else {
      const u = await this.prisma.user.findUnique({ where: { id: actor.id }, select: { associationId: true } });
      if (u?.associationId) {
        antennas = await this.prisma.antenna.findMany({
          where: { associationId: u.associationId, isActive: true },
          select: { id: true, name: true, city: true, associationId: true, association: { select: { name: true } } },
          orderBy: { name: 'asc' },
        });
      }
    }
    if (!antennas.length) return { canSend, currencies, antennas: [] };

    const associationId = antennas[0].associationId;
    const ids = antennas.map((a) => a.id);
    const [bal, reserved] = await Promise.all([
      antennaBalances(this.prisma, associationId, ids),
      pendingReserved(this.prisma, ids),
    ]);

    return {
      canSend,
      currencies,
      antennas: antennas
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((a) => ({
          id: a.id,
          name: a.name,
          city: a.city,
          associationName: a.association.name,
          balances: currencies.map((currency) => {
            const b = bal.get(`${a.id}|${currency}`) ?? new Prisma.Decimal(0);
            const r = reserved.get(`${a.id}|${currency}`) ?? new Prisma.Decimal(0);
            const avail = b.sub(r);
            return { currency, balance: money(b), reserved: money(r), available: money(avail.isNeg() ? new Prisma.Decimal(0) : avail) };
          }),
        })),
    };
  }

  async create(actor: Actor, dto: CreatePlatformTransferDto) {
    if (actor.role !== UserRole.ANTENNA_ADMIN) {
      throw new ForbiddenException("Seul l'administrateur d'une antenne peut envoyer un virement de commission.");
    }
    const [user, antennas, currencies] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: actor.id }, select: { firstName: true, lastName: true } }),
      this.assignedAntennas(actor.id),
      this.wallet.getCurrencies(),
    ]);
    if (!antennas.length) throw new ForbiddenException("Aucune antenne active n'est associée à votre compte.");

    let antenna = antennas[0];
    if (dto.senderAntennaId) {
      const found = antennas.find((a) => a.id === dto.senderAntennaId);
      if (!found) throw new ForbiddenException("Vous n'administrez pas cette antenne.");
      antenna = found;
    } else if (antennas.length > 1) {
      throw new BadRequestException("Vous administrez plusieurs antennes : précisez l'antenne expéditrice (senderAntennaId).");
    }

    if (!currencies.includes(dto.currency)) throw new BadRequestException(`La devise ${dto.currency} n'est pas acceptée par la plateforme.`);
    const amount = toMoney(dto.amount);

    if (dto.idempotencyKey) {
      const dup = await this.prisma.platformTransfer.findUnique({
        where: { initiatedByUserId_idempotencyKey: { initiatedByUserId: actor.id, idempotencyKey: dto.idempotencyKey } },
      });
      if (dup) return { ...this.map(dup), replayed: true };
    }

    const base: Omit<Prisma.PlatformTransferUncheckedCreateInput, 'reference'> = {
      associationId: antenna.associationId,
      associationName: antenna.association.name,
      senderAntennaId: antenna.id,
      senderAntennaName: antenna.name,
      initiatedByUserId: actor.id,
      initiatedByName: `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Administrateur',
      amount,
      currency: dto.currency,
      periodLabel: dto.periodLabel || null,
      notes: dto.notes || null,
      idempotencyKey: dto.idempotencyKey ?? null,
    };

    let created: Awaited<ReturnType<PrismaService['platformTransfer']['create']>> | undefined;
    for (let attempt = 0; attempt < 3 && !created; attempt++) {
      try {
        created = await this.prisma.$transaction(async (tx) => {
          await lockKey(tx, antennaLockKey(antenna.id, dto.currency));
          const [bal, reserved] = await Promise.all([
            antennaBalance(tx, antenna.associationId, antenna.id, dto.currency),
            pendingReservedFor(tx, antenna.id, dto.currency),
          ]);
          const available = bal.sub(reserved);
          if (available.lt(amount)) {
            throw new BadRequestException(
              `Solde insuffisant : ${money(available.isNeg() ? new Prisma.Decimal(0) : available)} ${dto.currency} disponibles sur « ${antenna.name} »` +
                (reserved.gt(0) ? ` (${money(reserved)} ${dto.currency} déjà engagés dans des virements en attente).` : '.'),
            );
          }
          const t = await tx.platformTransfer.create({ data: { ...base, reference: newReference() } });
          await tx.auditLog.create({
            data: {
              action: AuditAction.CREATE_PLATFORM_TRANSFER,
              entity: 'PlatformTransfer',
              entityId: t.id,
              details: { reference: t.reference, amount: amount.toFixed(2), currency: dto.currency, periodLabel: base.periodLabel },
              actorUserId: actor.id,
              associationId: antenna.associationId,
              antennaId: antenna.id,
            },
          });
          return t;
        }, TX_OPTS);
      } catch (e) {
        if (isUniqueViolation(e, 'reference')) continue; // collision de référence : on retire un tirage
        if (dto.idempotencyKey && isUniqueViolation(e, 'idempotencyKey')) {
          const dup = await this.prisma.platformTransfer.findUnique({
            where: { initiatedByUserId_idempotencyKey: { initiatedByUserId: actor.id, idempotencyKey: dto.idempotencyKey } },
          });
          if (dup) return { ...this.map(dup), replayed: true };
        }
        throw e;
      }
    }
    if (!created) throw new ConflictException('Impossible de générer une référence, réessaie.');

    await this.safely(() =>
      this.notifications.notifySystemAdmins(
        `💸 Commission à valider : ${money(amount)} ${dto.currency} de « ${antenna.name} » (${antenna.association.name}) — réf. ${created!.reference}.`,
        NotificationType.SYSTEM_ALERT,
        { kind: 'PLATFORM_TRANSFER', transferId: created.id },
      ),
    );
    return this.map(created);
  }

  /** L'expéditeur (ou un autre admin de la même antenne) annule tant que le Grand Chef n'a pas tranché. */
  async cancel(actor: Actor, id: string) {
    if (actor.role !== UserRole.ANTENNA_ADMIN) throw new ForbiddenException('Accès refusé.');
    const t = await this.prisma.platformTransfer.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Virement introuvable.');
    const mine = await this.assignedAntennas(actor.id);
    if (!mine.some((a) => a.id === t.senderAntennaId)) throw new ForbiddenException("Vous n'administrez pas cette antenne.");

    await this.prisma.$transaction(async (tx) => {
      const claim = await tx.platformTransfer.updateMany({
        where: { id, status: TransferStatus.PENDING_VALIDATION },
        data: { status: TransferStatus.CANCELLED, cancelledAt: new Date(), decidedByUserId: actor.id },
      });
      if (claim.count !== 1) {
        const now = await tx.platformTransfer.findUnique({ where: { id }, select: { status: true } });
        throw conflictFor(now?.status ?? '');
      }
      await tx.auditLog.create({
        data: {
          action: AuditAction.CANCEL_PLATFORM_TRANSFER,
          entity: 'PlatformTransfer',
          entityId: id,
          details: { reference: t.reference, amount: t.amount.toFixed(2), currency: t.currency },
          actorUserId: actor.id,
          associationId: t.associationId,
          antennaId: t.senderAntennaId,
        },
      });
    }, TX_OPTS);

    await this.safely(() =>
      this.notifications.notifySystemAdmins(`Commission ${t.reference} annulée par « ${t.senderAntennaName} ».`, NotificationType.SYSTEM_ALERT),
    );
    return { success: true };
  }

  /** Mes virements (admin d'antenne) ou ceux de mon association (super admin, lecture seule). */
  async listMine(actor: Actor, q: ListPlatformTransfersQueryDto) {
    const scope = await this.readScope(actor);
    const where: Prisma.PlatformTransferWhereInput = {
      AND: [
        scope,
        q.status ? { status: q.status } : {},
        q.currency ? { currency: q.currency } : {},
        q.antennaId ? { senderAntennaId: q.antennaId } : {},
        this.search(q.q),
      ],
    };
    return this.page(where, q);
  }

  // ───────────────────────── Côté Grand Chef ─────────────────────────

  async listAll(q: ListPlatformTransfersQueryDto) {
    const where: Prisma.PlatformTransferWhereInput = {
      AND: [
        q.status ? { status: q.status } : {},
        q.currency ? { currency: q.currency } : {},
        q.antennaId ? { senderAntennaId: q.antennaId } : {},
        q.associationId ? { associationId: q.associationId } : {},
        this.search(q.q),
      ],
    };
    return this.page(where, q);
  }

  async validate(actor: Actor, id: string) {
    const existing = await this.prisma.platformTransfer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Virement introuvable.');
    if (existing.status !== TransferStatus.PENDING_VALIDATION) throw conflictFor(existing.status);

    const done = await this.prisma.$transaction(async (tx) => {
      // 1) Verrou de l'antenne+devise : sérialise avec les créations et les autres validations.
      await lockKey(tx, antennaLockKey(existing.senderAntennaId, existing.currency));

      // 2) Réservation atomique de la transition (deux validations simultanées : une seule passe).
      const claim = await tx.platformTransfer.updateMany({
        where: { id, status: TransferStatus.PENDING_VALIDATION },
        data: { status: TransferStatus.VALIDATED, validatedAt: new Date(), decidedByUserId: actor.id },
      });
      if (claim.count !== 1) {
        const now = await tx.platformTransfer.findUnique({ where: { id }, select: { status: true } });
        throw conflictFor(now?.status ?? '');
      }

      // 3) Le solde de l'antenne a pu baisser depuis la création : on le relit (annule tout si insuffisant).
      const bal = await antennaBalance(tx, existing.associationId, existing.senderAntennaId, existing.currency);
      if (bal.lt(existing.amount)) {
        throw new ConflictException(
          `Solde insuffisant sur « ${existing.senderAntennaName} » : ${money(bal)} ${existing.currency} pour ${money(existing.amount)} demandés. ` +
            `Refuse le virement ou demande à l'antenne de le refaire.`,
        );
      }

      // 4) Les deux écritures, dans la MÊME transaction que la transition.
      const ledger = await tx.ledgerEntry.create({
        data: {
          associationId: existing.associationId,
          antennaId: existing.senderAntennaId,
          type: LedgerEntryType.TRANSFER_OUT,
          amount: existing.amount,
          currency: existing.currency,
          title: `Commission plateforme (${existing.reference})`,
          description: existing.notes,
          effectiveDate: new Date(),
          createdByUserId: existing.initiatedByUserId,
          referenceCode: existing.reference,
        },
      });
      const walletEntry = await tx.platformWalletEntry.create({
        data: {
          type: 'COMMISSION_IN',
          currency: existing.currency,
          amount: existing.amount,
          title: `Commission ${existing.associationName} · ${existing.senderAntennaName}`,
          description: [existing.periodLabel, existing.notes].filter(Boolean).join(' — ') || null,
          referenceCode: existing.reference,
          associationId: existing.associationId,
          createdByUserId: actor.id,
        },
      });
      const updated = await tx.platformTransfer.update({
        where: { id },
        data: { senderLedgerEntryId: ledger.id, walletEntryId: walletEntry.id },
      });
      await tx.auditLog.create({
        data: {
          action: AuditAction.VALIDATE_PLATFORM_TRANSFER,
          entity: 'PlatformTransfer',
          entityId: id,
          details: { reference: existing.reference, amount: existing.amount.toFixed(2), currency: existing.currency, ledgerEntryId: ledger.id, walletEntryId: walletEntry.id },
          actorUserId: actor.id,
          associationId: existing.associationId,
          antennaId: existing.senderAntennaId,
        },
      });
      return updated;
    }, TX_OPTS);

    await this.notifyOutcome(done, `✅ Commission validée : ${money(done.amount)} ${done.currency} (réf. ${done.reference}) reçus par la plateforme.`, '✅ Commission validée');
    return this.map(done);
  }

  async reject(actor: Actor, id: string, reason: string) {
    const existing = await this.prisma.platformTransfer.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Virement introuvable.');

    const done = await this.prisma.$transaction(async (tx) => {
      const claim = await tx.platformTransfer.updateMany({
        where: { id, status: TransferStatus.PENDING_VALIDATION },
        data: { status: TransferStatus.REJECTED, rejectedAt: new Date(), decidedByUserId: actor.id, rejectionReason: reason },
      });
      if (claim.count !== 1) {
        const now = await tx.platformTransfer.findUnique({ where: { id }, select: { status: true } });
        throw conflictFor(now?.status ?? '');
      }
      await tx.auditLog.create({
        data: {
          action: AuditAction.REJECT_PLATFORM_TRANSFER,
          entity: 'PlatformTransfer',
          entityId: id,
          details: { reference: existing.reference, amount: existing.amount.toFixed(2), currency: existing.currency, reason },
          actorUserId: actor.id,
          associationId: existing.associationId,
          antennaId: existing.senderAntennaId,
        },
      });
      return tx.platformTransfer.findUniqueOrThrow({ where: { id } });
    }, TX_OPTS);

    await this.notifyOutcome(done, `❌ Commission refusée (réf. ${done.reference}). Motif : ${reason}`, '❌ Commission refusée');
    return this.map(done);
  }

  // ───────────────────────── Internes ─────────────────────────

  private search(q?: string): Prisma.PlatformTransferWhereInput {
    if (!q) return {};
    return {
      OR: [
        { reference: { contains: q, mode: 'insensitive' } },
        { associationName: { contains: q, mode: 'insensitive' } },
        { senderAntennaName: { contains: q, mode: 'insensitive' } },
      ],
    };
  }

  private async page(where: Prisma.PlatformTransferWhereInput, q: ListPlatformTransfersQueryDto) {
    const { page, pageSize, skip } = pageParams(q.page, q.pageSize);
    const [items, total] = await Promise.all([
      this.prisma.platformTransfer.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      this.prisma.platformTransfer.count({ where }),
    ]);
    return { items: items.map((t) => this.map(t)), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  /** Prévient l'expéditeur et les super admins de l'association (lecture seule). Jamais bloquant. */
  private async notifyOutcome(t: { associationId: string; initiatedByUserId: string }, message: string, title: string) {
    await this.safely(async () => {
      await this.notifications.createForUser({
        associationId: t.associationId,
        userId: t.initiatedByUserId,
        message,
        type: NotificationType.SYSTEM_ALERT,
        title,
      });
      await this.notifications.notifySuperAdmins(t.associationId, message, NotificationType.SYSTEM_ALERT);
    });
  }

  private async safely(fn: () => Promise<unknown>) {
    try {
      await fn();
    } catch (e) {
      this.logger.warn(`Notification ignorée : ${(e as Error).message}`);
    }
  }

  private map = (t: {
    id: string; reference: string; associationId: string; associationName: string; senderAntennaId: string; senderAntennaName: string;
    initiatedByName: string; amount: Prisma.Decimal; currency: CurrencyCode; purpose: string; periodLabel: string | null; notes: string | null;
    status: TransferStatus; validatedAt: Date | null; rejectedAt: Date | null; cancelledAt: Date | null; rejectionReason: string | null; createdAt: Date;
  }) => ({
    id: t.id,
    reference: t.reference,
    associationId: t.associationId,
    associationName: t.associationName,
    senderAntennaId: t.senderAntennaId,
    senderAntennaName: t.senderAntennaName,
    initiatedByName: t.initiatedByName,
    amount: money(t.amount),
    currency: t.currency,
    purpose: t.purpose,
    periodLabel: t.periodLabel,
    notes: t.notes,
    status: t.status,
    validatedAt: t.validatedAt?.toISOString() ?? null,
    rejectedAt: t.rejectedAt?.toISOString() ?? null,
    cancelledAt: t.cancelledAt?.toISOString() ?? null,
    rejectionReason: t.rejectionReason,
    createdAt: t.createdAt.toISOString(),
  });
}
