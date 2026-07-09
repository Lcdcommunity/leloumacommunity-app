// backend/src/modules/transfers/super-admin-transfers.service.ts
import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma, TransferStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SuperAdminTransfersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Contexte SUPER_ADMIN (lecture seule, toutes antennes de l'association) ─
  private async getSuperAdminContext(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, associationId: true },
    });
    if (!user) throw new ForbiddenException('Utilisateur introuvable.');
    if (user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Accès réservé au Super Admin.');
    }
    if (!user.associationId) {
      throw new ForbiddenException('Aucune association associée à ce compte.');
    }
    return { associationId: user.associationId };
  }

  // ── Vue globale (lecture seule) de tous les virements de l'association ────
  async listAll(
    userId: string,
    params: { page: number; pageSize: number; status?: string; antennaId?: string },
  ) {
    const { associationId } = await this.getSuperAdminContext(userId);
    const { page, pageSize, status, antennaId } = params;
    const skip = (page - 1) * pageSize;

    const where: Prisma.AntennaTransferWhereInput = {
      associationId,
      ...(status ? { status: status as TransferStatus } : {}),
      ...(antennaId
        ? { OR: [{ senderAntennaId: antennaId }, { receiverAntennaId: antennaId }] }
        : {}),
    };

    const [items, total, totalAll, pendingCount, validatedCount, rejectedCount] = await Promise.all([
      this.prisma.antennaTransfer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          senderAntenna:   { select: { name: true, city: true } },
          receiverAntenna: { select: { name: true, city: true } },
          initiatedByUser: { select: { firstName: true, lastName: true } },
          // ⚠️ Par analogie avec initiatedByUser. Je n'ai pas ton schema.prisma
          // donc je ne peux pas garantir que ces 2 relations existent sous ce
          // nom exact. Si Prisma râle au build, supprime juste ces 2 lignes —
          // validatedBy/rejectedBy retomberont sur null, rien ne casse.
          validatedByUser: { select: { firstName: true, lastName: true } },
          rejectedByUser:  { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.antennaTransfer.count({ where }),
      this.prisma.antennaTransfer.count({ where: { associationId } }),
      this.prisma.antennaTransfer.count({ where: { associationId, status: TransferStatus.PENDING_VALIDATION } }),
      this.prisma.antennaTransfer.count({ where: { associationId, status: TransferStatus.VALIDATED } }),
      this.prisma.antennaTransfer.count({ where: { associationId, status: TransferStatus.REJECTED } }),
    ]);

    return {
      items: items.map(this.map),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      stats: {
        pending:   pendingCount,
        validated: validatedCount,
        rejected:  rejectedCount,
        total:     totalAll,
      },
    };
  }

  // ── Mapper (interne) ────────────────────────────────────────────────────
  private map = (t: any) => ({
    id: t.id,
    status: t.status,
    sendAmount:      Number(t.sendAmount),
    sendCurrency:    t.sendCurrency,
    receiveAmount:   Number(t.receiveAmount),
    receiveCurrency: t.receiveCurrency,
    notes: t.notes,
    rejectionReason: t.rejectionReason,
    createdAt:   t.createdAt,
    validatedAt: t.validatedAt,
    rejectedAt:  t.rejectedAt,
    senderAntenna:   t.senderAntenna   ?? null,
    receiverAntenna: t.receiverAntenna ?? null,
    initiatedBy: t.initiatedByUser
      ? `${t.initiatedByUser.firstName} ${t.initiatedByUser.lastName}`
      : null,
    validatedBy: t.validatedByUser
      ? `${t.validatedByUser.firstName} ${t.validatedByUser.lastName}`
      : null,
    rejectedBy: t.rejectedByUser
      ? `${t.rejectedByUser.firstName} ${t.rejectedByUser.lastName}`
      : null,
  });
}