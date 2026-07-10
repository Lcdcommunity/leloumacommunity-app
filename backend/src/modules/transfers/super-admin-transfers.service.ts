// backend/src/modules/transfers/super-admin-transfers.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma, TransferStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SuperAdminTransfersService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Vue globale (lecture seule) de tous les virements de l'association ────
  async listAll(
    associationId: string,
    params: { page: number; pageSize: number; status?: string; antennaId?: string },
  ) {
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

  // ── Modifier un virement (montants / notes) — même déjà validé ────────────
  async updateTransfer(
    associationId: string,
    actorUserId: string,
    transferId: string,
    dto: { sendAmount?: number; receiveAmount?: number; notes?: string },
  ) {
    const transfer = await this.prisma.antennaTransfer.findFirst({
      where: { id: transferId, associationId },
    });
    if (!transfer) throw new NotFoundException('Virement introuvable.');

    const newSendAmount    = dto.sendAmount    !== undefined ? new Prisma.Decimal(dto.sendAmount)    : transfer.sendAmount;
    const newReceiveAmount = dto.receiveAmount !== undefined ? new Prisma.Decimal(dto.receiveAmount) : transfer.receiveAmount;
    const newNotes         = dto.notes         !== undefined ? dto.notes : transfer.notes;

    await this.prisma.$transaction(async (tx) => {
      await tx.antennaTransfer.update({
        where: { id: transferId },
        data: {
          sendAmount:    newSendAmount,
          receiveAmount: newReceiveAmount,
          notes:         newNotes,
        },
      });

      if (transfer.status === TransferStatus.VALIDATED) {
        if (transfer.senderLedgerEntryId) {
          await tx.ledgerEntry.update({
            where: { id: transfer.senderLedgerEntryId },
            data: { amount: newSendAmount },
          });
        }
        if (transfer.receiverLedgerEntryId) {
          await tx.ledgerEntry.update({
            where: { id: transfer.receiverLedgerEntryId },
            data: { amount: newReceiveAmount },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          action: AuditAction.UPDATE,
          entity: 'AntennaTransfer',
          entityId: transferId,
          details: {
            before: {
              sendAmount: Number(transfer.sendAmount),
              receiveAmount: Number(transfer.receiveAmount),
              notes: transfer.notes,
            },
            after: {
              sendAmount: Number(newSendAmount),
              receiveAmount: Number(newReceiveAmount),
              notes: newNotes,
            },
            transferStatus: transfer.status,
          },
          actorUserId,
          associationId,
        },
      });
    });

    return { success: true };
  }

  // ── Supprimer un virement — même déjà validé ───────────────────────────────
  async deleteTransfer(associationId: string, actorUserId: string, transferId: string) {
    const transfer = await this.prisma.antennaTransfer.findFirst({
      where: { id: transferId, associationId },
    });
    if (!transfer) throw new NotFoundException('Virement introuvable.');

    await this.prisma.$transaction(async (tx) => {
      if (transfer.senderLedgerEntryId) {
        await tx.ledgerEntry.delete({ where: { id: transfer.senderLedgerEntryId } });
      }
      if (transfer.receiverLedgerEntryId) {
        await tx.ledgerEntry.delete({ where: { id: transfer.receiverLedgerEntryId } });
      }

      await tx.antennaTransfer.delete({ where: { id: transferId } });

      await tx.auditLog.create({
        data: {
          action: AuditAction.DELETE,
          entity: 'AntennaTransfer',
          entityId: transferId,
          details: {
            senderAntennaId: transfer.senderAntennaId,
            receiverAntennaId: transfer.receiverAntennaId,
            sendAmount: Number(transfer.sendAmount),
            sendCurrency: transfer.sendCurrency,
            receiveAmount: Number(transfer.receiveAmount),
            receiveCurrency: transfer.receiveCurrency,
            status: transfer.status,
          },
          actorUserId,
          associationId,
        },
      });
    });

    return { success: true };
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