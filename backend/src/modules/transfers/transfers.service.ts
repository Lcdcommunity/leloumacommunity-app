// backend/src/modules/transfers/transfers.service.ts
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  LedgerEntryType,
  NotificationType,
  Prisma,
  TransferStatus,
  UserRole,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ── Contexte admin (uniquement ANTENNA_ADMIN) ──────────────────────────────
  private async getAdminContext(adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, role: true, associationId: true },
    });
    if (!user) throw new ForbiddenException('Utilisateur introuvable.');

    if (user.role === UserRole.SUPER_ADMIN) {
      // Le super-admin n'a pas d'antenne propre ; on prend la première active
      const antenna = await this.prisma.antenna.findFirst({
        where: { associationId: user.associationId!, isActive: true },
        orderBy: { name: 'asc' },
      });
      if (!antenna) throw new ForbiddenException('Aucune antenne disponible.');
      return { antennaId: antenna.id, associationId: user.associationId!, antenna };
    }

    const assignment = await this.prisma.antennaAdminAssignment.findFirst({
      where: { adminUserId: adminId, isActive: true },
      include: { antenna: true },
    });
    if (!assignment?.antenna)
      throw new ForbiddenException("Aucune antenne active n'est associée à votre compte.");

    return {
      antennaId: assignment.antennaId,
      associationId: assignment.antenna.associationId,
      antenna: assignment.antenna,
    };
  }

  // ── Info expéditeur (pré-remplissage formulaire) ───────────────────────────
  async getSenderInfo(adminId: string) {
    const { antennaId, antenna } = await this.getAdminContext(adminId);
    return { antennaId, antennaName: antenna.name, currency: antenna.defaultCurrency };
  }

  // ── Liste des antennes de destination disponibles ─────────────────────────
  async listDestinations(adminId: string) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);
    return this.prisma.antenna.findMany({
      where: { associationId, isActive: true, id: { not: antennaId } },
      select: { id: true, name: true, defaultCurrency: true, city: true, country: true },
      orderBy: { name: 'asc' },
    });
  }

  // ── Créer un virement (statut PENDING_VALIDATION) ─────────────────────────
  async createTransfer(adminId: string, dto: CreateTransferDto) {
    const { antennaId, associationId, antenna } = await this.getAdminContext(adminId);

    const receiver = await this.prisma.antenna.findFirst({
      where: { id: dto.receiverAntennaId, associationId, isActive: true },
    });
    if (!receiver) throw new NotFoundException('Antenne de destination introuvable.');
    if (receiver.id === antennaId)
      throw new BadRequestException("Impossible de virer vers sa propre antenne.");

    const transfer = await this.prisma.antennaTransfer.create({
      data: {
        associationId,
        senderAntennaId:  antennaId,
        initiatedByUserId: adminId,
        sendAmount:   new Prisma.Decimal(dto.sendAmount),
        sendCurrency: antenna.defaultCurrency,
        receiverAntennaId: dto.receiverAntennaId,
        receiveAmount:   new Prisma.Decimal(dto.receiveAmount),
        receiveCurrency: receiver.defaultCurrency,
        notes: dto.notes ?? null,
      },
    });

    // Notifier les admins de l'antenne destinataire
    const destAdmins = await this.prisma.antennaAdminAssignment.findMany({
      where: { antennaId: dto.receiverAntennaId, isActive: true },
      select: { adminUserId: true },
    });
    for (const a of destAdmins) {
      await this.notifications.createForUser({
        associationId,
        userId: a.adminUserId,
        message: `Virement entrant de "${antenna.name}" : ${dto.sendAmount} ${antenna.defaultCurrency} → ${dto.receiveAmount} ${receiver.defaultCurrency}. En attente de votre validation.`,
        type: NotificationType.SYSTEM_ALERT,
        title: '💸 Virement entrant',
      });
    }

    return transfer;
  }

  // ── Virements envoyés par mon antenne ─────────────────────────────────────
  async listSent(adminId: string, page: number, pageSize: number) {
    const { antennaId } = await this.getAdminContext(adminId);
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      this.prisma.antennaTransfer.findMany({
        where: { senderAntennaId: antennaId },
        skip, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          receiverAntenna: { select: { name: true, city: true } },
          initiatedByUser: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.antennaTransfer.count({ where: { senderAntennaId: antennaId } }),
    ]);

    return { items: items.map(this.map), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ── Virements reçus par mon antenne ───────────────────────────────────────
  async listReceived(adminId: string, page: number, pageSize: number, status?: string) {
    const { antennaId } = await this.getAdminContext(adminId);
    const skip = (page - 1) * pageSize;

    const where: Prisma.AntennaTransferWhereInput = {
      receiverAntennaId: antennaId,
      ...(status ? { status: status as TransferStatus } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.antennaTransfer.findMany({
        where, skip, take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          senderAntenna:  { select: { name: true, city: true } },
          initiatedByUser: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.antennaTransfer.count({ where }),
    ]);

    return { items: items.map(this.map), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ── Valider un virement reçu (crée les 2 entrées ledger) ─────────────────
  async validateTransfer(transferId: string, adminId: string) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);

    const transfer = await this.prisma.antennaTransfer.findFirst({
      where: { id: transferId, receiverAntennaId: antennaId, status: TransferStatus.PENDING_VALIDATION },
      include: {
        senderAntenna:   { select: { name: true } },
        receiverAntenna: { select: { name: true } },
        initiatedByUser: { select: { id: true } },
      },
    });
    if (!transfer) throw new NotFoundException('Virement introuvable ou déjà traité.');

    await this.prisma.$transaction(async (tx) => {
      // Écriture sortante chez l'expéditeur
      const sEntry = await tx.ledgerEntry.create({
        data: {
          associationId,
          antennaId: transfer.senderAntennaId,
          type:     LedgerEntryType.TRANSFER_OUT,
          amount:   transfer.sendAmount,
          currency: transfer.sendCurrency,
          title:    `Virement sortant → ${transfer.receiverAntenna.name}`,
          description:   transfer.notes,
          effectiveDate: new Date(),
          createdByUserId: adminId,
          referenceCode: transferId,
        },
      });

      // Écriture entrante chez le destinataire
      const rEntry = await tx.ledgerEntry.create({
        data: {
          associationId,
          antennaId: transfer.receiverAntennaId,
          type:     LedgerEntryType.TRANSFER_IN,
          amount:   transfer.receiveAmount,
          currency: transfer.receiveCurrency,
          title:    `Virement reçu ← ${transfer.senderAntenna.name}`,
          description:   transfer.notes,
          effectiveDate: new Date(),
          createdByUserId: adminId,
          referenceCode: transferId,
        },
      });

      // Mise à jour du virement
      await tx.antennaTransfer.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.VALIDATED,
          validatedByUserId: adminId,
          validatedAt: new Date(),
          senderLedgerEntryId:   sEntry.id,
          receiverLedgerEntryId: rEntry.id,
        },
      });
    });

    // Notifier l'initiateur
    await this.notifications.createForUser({
      associationId,
      userId: transfer.initiatedByUser.id,
      message: `Votre virement de ${transfer.sendAmount} ${transfer.sendCurrency} vers "${transfer.receiverAntenna.name}" a été validé. Montant crédité : ${transfer.receiveAmount} ${transfer.receiveCurrency}.`,
      type: NotificationType.SYSTEM_ALERT,
      title: '✅ Virement validé',
    });

    return { success: true };
  }

  // ── Rejeter un virement reçu ──────────────────────────────────────────────
  async rejectTransfer(transferId: string, adminId: string, reason: string) {
    const { antennaId, associationId } = await this.getAdminContext(adminId);

    const transfer = await this.prisma.antennaTransfer.findFirst({
      where: { id: transferId, receiverAntennaId: antennaId, status: TransferStatus.PENDING_VALIDATION },
      include: {
        receiverAntenna: { select: { name: true } },
        initiatedByUser: { select: { id: true } },
      },
    });
    if (!transfer) throw new NotFoundException('Virement introuvable ou déjà traité.');

    await this.prisma.antennaTransfer.update({
      where: { id: transferId },
      data: {
        status: TransferStatus.REJECTED,
        rejectedByUserId: adminId,
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    await this.notifications.createForUser({
      associationId,
      userId: transfer.initiatedByUser.id,
      message: `Votre virement vers "${transfer.receiverAntenna.name}" a été refusé. Motif : ${reason}`,
      type: NotificationType.SYSTEM_ALERT,
      title: '❌ Virement refusé',
    });

    return { success: true };
  }

  // ── Annuler un virement envoyé (expéditeur, avant validation) ─────────────
  async cancelTransfer(transferId: string, adminId: string) {
    const { antennaId } = await this.getAdminContext(adminId);

    const transfer = await this.prisma.antennaTransfer.findFirst({
      where: { id: transferId, senderAntennaId: antennaId, status: TransferStatus.PENDING_VALIDATION },
    });
    if (!transfer) throw new NotFoundException('Virement introuvable ou déjà traité.');

    await this.prisma.antennaTransfer.update({
      where: { id: transferId },
      data: { status: TransferStatus.CANCELLED },
    });

    return { success: true };
  }

  // ── Mapper (interne) ──────────────────────────────────────────────────────
  private map = (t: any) => ({
    id: t.id,
    status: t.status,
    sendAmount:     Number(t.sendAmount),
    sendCurrency:   t.sendCurrency,
    receiveAmount:  Number(t.receiveAmount),
    receiveCurrency: t.receiveCurrency,
    notes: t.notes,
    rejectionReason: t.rejectionReason,
    createdAt:  t.createdAt,
    validatedAt: t.validatedAt,
    senderAntenna:   t.senderAntenna  ?? null,
    receiverAntenna: t.receiverAntenna ?? null,
    initiatedBy: t.initiatedByUser
      ? `${t.initiatedByUser.firstName} ${t.initiatedByUser.lastName}`
      : null,
  });
}