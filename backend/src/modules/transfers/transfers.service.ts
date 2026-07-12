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

  // ── Contexte "j'agis en tant que CETTE antenne" (création / prérequis) ────
  // Utilisé uniquement là où une antenne unique doit être déterminée
  // (envoyer un virement, voir les destinations possibles). Si l'admin gère
  // plusieurs antennes actives et n'a pas précisé antennaId, on refuse au
  // lieu de deviner laquelle débiter.
  private async getAdminContext(adminId: string, antennaId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { id: true, role: true, associationId: true },
    });
    if (!user) throw new ForbiddenException('Utilisateur introuvable.');

    if (user.role === UserRole.SUPER_ADMIN) {
      if (!user.associationId) throw new ForbiddenException('Aucune association associée à ce compte.');
      const antenna = antennaId
        ? await this.prisma.antenna.findFirst({
            where: { id: antennaId, associationId: user.associationId, isActive: true },
          })
        : await this.prisma.antenna.findFirst({
            where: { associationId: user.associationId, isActive: true },
            orderBy: { name: 'asc' },
          });
      if (!antenna) throw new ForbiddenException('Antenne introuvable ou inactive.');
      return { antennaId: antenna.id, associationId: user.associationId, antenna };
    }

    const assignments = await this.prisma.antennaAdminAssignment.findMany({
      where: { adminUserId: adminId, isActive: true },
      include: { antenna: true },
    });
    if (assignments.length === 0) {
      throw new ForbiddenException("Aucune antenne active n'est associée à votre compte.");
    }

    if (antennaId) {
      const found = assignments.find((a) => a.antennaId === antennaId);
      if (!found?.antenna) throw new ForbiddenException("Vous n'administrez pas cette antenne.");
      return { antennaId: found.antennaId, associationId: found.antenna.associationId, antenna: found.antenna };
    }

    if (assignments.length > 1) {
      throw new BadRequestException(
        "Vous administrez plusieurs antennes. Précisez l'antenne expéditrice (antennaId).",
      );
    }

    const only = assignments[0];
    return { antennaId: only.antennaId, associationId: only.antenna.associationId, antenna: only.antenna };
  }

  // ── Ensemble des antennes gérées (historique) ───────────────────────────
  // Contrairement à getAdminContext, ne force jamais un choix : sans
  // antennaId, retourne TOUTES les antennes gérées (union) pour que
  // l'historique reste consultable même en cas d'ambiguïté.
  private async getManagedAntennaIds(adminId: string, antennaId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, associationId: true },
    });
    if (!user) throw new ForbiddenException('Utilisateur introuvable.');

    if (user.role === UserRole.SUPER_ADMIN) {
      if (!user.associationId) throw new ForbiddenException('Aucune association associée à ce compte.');
      if (antennaId) {
        const antenna = await this.prisma.antenna.findFirst({
          where: { id: antennaId, associationId: user.associationId, isActive: true },
        });
        if (!antenna) throw new ForbiddenException('Antenne introuvable.');
        return { associationId: user.associationId, antennaIds: [antenna.id] };
      }
      const antennas = await this.prisma.antenna.findMany({
        where: { associationId: user.associationId, isActive: true },
        select: { id: true },
      });
      return { associationId: user.associationId, antennaIds: antennas.map((a) => a.id) };
    }

    const assignments = await this.prisma.antennaAdminAssignment.findMany({
      where: { adminUserId: adminId, isActive: true },
      select: { antennaId: true, antenna: { select: { associationId: true } } },
    });
    if (assignments.length === 0) {
      throw new ForbiddenException("Aucune antenne active n'est associée à votre compte.");
    }
    const associationId = assignments[0].antenna.associationId;

    if (antennaId) {
      if (!assignments.some((a) => a.antennaId === antennaId)) {
        throw new ForbiddenException("Vous n'administrez pas cette antenne.");
      }
      return { associationId, antennaIds: [antennaId] };
    }

    return { associationId, antennaIds: assignments.map((a) => a.antennaId) };
  }

  // ── Vérif de droits sur UNE antenne précise (validation/refus/annulation) ─
  // Dérive l'antenne concernée directement du virement ciblé au lieu de
  // demander au frontend de la préciser à l'avance : élimine l'ambiguïté
  // sans aucun changement d'UI pour ces 3 actions.
  private async assertManagesAntenna(
    adminId: string,
    user: { role: UserRole; associationId: string | null },
    antennaId: string,
    transferAssociationId: string,
  ) {
    if (user.role === UserRole.SUPER_ADMIN) {
      if (user.associationId !== transferAssociationId) {
        throw new ForbiddenException('Accès refusé.');
      }
      return;
    }
    const hasRights = await this.prisma.antennaAdminAssignment.findFirst({
      where: { adminUserId: adminId, antennaId, isActive: true },
    });
    if (!hasRights) {
      throw new ForbiddenException('Vous ne gérez pas cette antenne.');
    }
  }

  // ── Antennes gérées par l'admin (pour le sélecteur d'antenne expéditrice) ─
  async listMyAntennas(adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, associationId: true },
    });
    if (!user) throw new ForbiddenException('Utilisateur introuvable.');

    if (user.role === UserRole.SUPER_ADMIN) {
      if (!user.associationId) return [];
      return this.prisma.antenna.findMany({
        where: { associationId: user.associationId, isActive: true },
        select: { id: true, name: true, defaultCurrency: true, city: true },
        orderBy: { name: 'asc' },
      });
    }

    const assignments = await this.prisma.antennaAdminAssignment.findMany({
      where: { adminUserId: adminId, isActive: true },
      include: {
        antenna: { select: { id: true, name: true, defaultCurrency: true, city: true, isActive: true } },
      },
    });

    return assignments
      .filter((a) => a.antenna?.isActive)
      .map((a) => a.antenna!)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // ── Info expéditeur (pré-remplissage formulaire) ───────────────────────────
  async getSenderInfo(adminId: string, antennaId?: string) {
    const { antennaId: resolvedId, antenna } = await this.getAdminContext(adminId, antennaId);
    return { antennaId: resolvedId, antennaName: antenna.name, currency: antenna.defaultCurrency };
  }

  // ── Liste des antennes de destination disponibles ─────────────────────────
  async listDestinations(adminId: string, antennaId?: string) {
    const { antennaId: resolvedId, associationId } = await this.getAdminContext(adminId, antennaId);
    return this.prisma.antenna.findMany({
      where: { associationId, isActive: true, id: { not: resolvedId } },
      select: { id: true, name: true, defaultCurrency: true, city: true, country: true },
      orderBy: { name: 'asc' },
    });
  }

  // ── Créer un virement (statut PENDING_VALIDATION) ─────────────────────────
  async createTransfer(adminId: string, dto: CreateTransferDto) {
    const { antennaId, associationId, antenna } = await this.getAdminContext(adminId, dto.senderAntennaId);

    const receiver = await this.prisma.antenna.findFirst({
      where: { id: dto.receiverAntennaId, associationId, isActive: true },
    });
    if (!receiver) throw new NotFoundException('Antenne de destination introuvable.');
    if (receiver.id === antennaId)
      throw new BadRequestException('Impossible de virer vers sa propre antenne.');

    const transfer = await this.prisma.antennaTransfer.create({
      data: {
        associationId,
        senderAntennaId: antennaId,
        initiatedByUserId: adminId,
        sendAmount: new Prisma.Decimal(dto.sendAmount),
        sendCurrency: antenna.defaultCurrency,
        receiverAntennaId: dto.receiverAntennaId,
        receiveAmount: new Prisma.Decimal(dto.receiveAmount),
        receiveCurrency: receiver.defaultCurrency,
        notes: dto.notes ?? null,
      },
    });

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

  // ── Virements envoyés (toutes mes antennes, ou une seule si antennaId) ────
  async listSent(adminId: string, page: number, pageSize: number, antennaId?: string) {
    const { antennaIds } = await this.getManagedAntennaIds(adminId, antennaId);
    const skip = (page - 1) * pageSize;
    const where: Prisma.AntennaTransferWhereInput = { senderAntennaId: { in: antennaIds } };

    const [items, total] = await Promise.all([
      this.prisma.antennaTransfer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          senderAntenna: { select: { name: true, city: true } },
          receiverAntenna: { select: { name: true, city: true } },
          initiatedByUser: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.antennaTransfer.count({ where }),
    ]);

    return { items: items.map(this.map), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ── Virements reçus (toutes mes antennes, ou une seule si antennaId) ──────
  async listReceived(adminId: string, page: number, pageSize: number, status?: string, antennaId?: string) {
    const { antennaIds } = await this.getManagedAntennaIds(adminId, antennaId);
    const skip = (page - 1) * pageSize;

    const where: Prisma.AntennaTransferWhereInput = {
      receiverAntennaId: { in: antennaIds },
      ...(status ? { status: status as TransferStatus } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.antennaTransfer.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          senderAntenna: { select: { name: true, city: true } },
          receiverAntenna: { select: { name: true, city: true } },
          initiatedByUser: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.antennaTransfer.count({ where }),
    ]);

    return { items: items.map(this.map), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ── Valider un virement reçu (crée les 2 entrées ledger) ─────────────────
  async validateTransfer(transferId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, associationId: true },
    });
    if (!user) throw new ForbiddenException('Utilisateur introuvable.');

    const transfer = await this.prisma.antennaTransfer.findFirst({
      where: { id: transferId, status: TransferStatus.PENDING_VALIDATION },
      include: {
        senderAntenna: { select: { name: true } },
        receiverAntenna: { select: { name: true } },
        initiatedByUser: { select: { id: true } },
      },
    });
    if (!transfer) throw new NotFoundException('Virement introuvable ou déjà traité.');

    await this.assertManagesAntenna(adminId, user, transfer.receiverAntennaId, transfer.associationId);

    await this.prisma.$transaction(async (tx) => {
      const sEntry = await tx.ledgerEntry.create({
        data: {
          associationId: transfer.associationId,
          antennaId: transfer.senderAntennaId,
          type: LedgerEntryType.TRANSFER_OUT,
          amount: transfer.sendAmount,
          currency: transfer.sendCurrency,
          title: `Virement sortant → ${transfer.receiverAntenna.name}`,
          description: transfer.notes,
          effectiveDate: new Date(),
          createdByUserId: adminId,
          referenceCode: transferId,
        },
      });

      const rEntry = await tx.ledgerEntry.create({
        data: {
          associationId: transfer.associationId,
          antennaId: transfer.receiverAntennaId,
          type: LedgerEntryType.TRANSFER_IN,
          amount: transfer.receiveAmount,
          currency: transfer.receiveCurrency,
          title: `Virement reçu ← ${transfer.senderAntenna.name}`,
          description: transfer.notes,
          effectiveDate: new Date(),
          createdByUserId: adminId,
          referenceCode: transferId,
        },
      });

      await tx.antennaTransfer.update({
        where: { id: transferId },
        data: {
          status: TransferStatus.VALIDATED,
          validatedByUserId: adminId,
          validatedAt: new Date(),
          senderLedgerEntryId: sEntry.id,
          receiverLedgerEntryId: rEntry.id,
        },
      });
    });

    await this.notifications.createForUser({
      associationId: transfer.associationId,
      userId: transfer.initiatedByUser.id,
      message: `Votre virement de ${transfer.sendAmount} ${transfer.sendCurrency} vers "${transfer.receiverAntenna.name}" a été validé. Montant crédité : ${transfer.receiveAmount} ${transfer.receiveCurrency}.`,
      type: NotificationType.SYSTEM_ALERT,
      title: '✅ Virement validé',
    });

    return { success: true };
  }

  // ── Rejeter un virement reçu ──────────────────────────────────────────────
  async rejectTransfer(transferId: string, adminId: string, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, associationId: true },
    });
    if (!user) throw new ForbiddenException('Utilisateur introuvable.');

    const transfer = await this.prisma.antennaTransfer.findFirst({
      where: { id: transferId, status: TransferStatus.PENDING_VALIDATION },
      include: {
        receiverAntenna: { select: { name: true } },
        initiatedByUser: { select: { id: true } },
      },
    });
    if (!transfer) throw new NotFoundException('Virement introuvable ou déjà traité.');

    await this.assertManagesAntenna(adminId, user, transfer.receiverAntennaId, transfer.associationId);

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
      associationId: transfer.associationId,
      userId: transfer.initiatedByUser.id,
      message: `Votre virement vers "${transfer.receiverAntenna.name}" a été refusé. Motif : ${reason}`,
      type: NotificationType.SYSTEM_ALERT,
      title: '❌ Virement refusé',
    });

    return { success: true };
  }

  // ── Annuler un virement envoyé (expéditeur, avant validation) ─────────────
  async cancelTransfer(transferId: string, adminId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true, associationId: true },
    });
    if (!user) throw new ForbiddenException('Utilisateur introuvable.');

    const transfer = await this.prisma.antennaTransfer.findFirst({
      where: { id: transferId, status: TransferStatus.PENDING_VALIDATION },
    });
    if (!transfer) throw new NotFoundException('Virement introuvable ou déjà traité.');

    await this.assertManagesAntenna(adminId, user, transfer.senderAntennaId, transfer.associationId);

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
    sendAmount: Number(t.sendAmount),
    sendCurrency: t.sendCurrency,
    receiveAmount: Number(t.receiveAmount),
    receiveCurrency: t.receiveCurrency,
    notes: t.notes,
    rejectionReason: t.rejectionReason,
    createdAt: t.createdAt,
    validatedAt: t.validatedAt,
    senderAntenna: t.senderAntenna ?? null,
    receiverAntenna: t.receiverAntenna ?? null,
    initiatedBy: t.initiatedByUser
      ? `${t.initiatedByUser.firstName} ${t.initiatedByUser.lastName}`
      : null,
  });
}