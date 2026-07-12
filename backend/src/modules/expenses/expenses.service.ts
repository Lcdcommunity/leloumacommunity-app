// backend/src/modules/expenses/expenses.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExpenseStatus, LedgerEntryType, ExpenseCategory, CurrencyCode, PaymentMethod, Prisma, NotificationType } from '@prisma/client';
import { CreateExpenseDto, RejectExpenseDto } from './dto/expense.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ==========================================
  // LOGIQUE ADMIN D'ANTENNE
  // ==========================================

  async createAntennaExpense(adminUserId: string, dto: CreateExpenseDto) {
    const assignment = await this.prisma.antennaAdminAssignment.findFirst({
      where: { adminUserId, isActive: true },
      include: { antenna: true, association: true }
    });

    if (!assignment) {
      throw new ForbiddenException("Vous n'êtes assigné à aucune antenne active.");
    }

    const { antenna, association } = assignment;
    const currencyToUse = (dto.currency || antenna.defaultCurrency || 'EUR') as CurrencyCode;

    // 🔒 Seuil décidé par devise (SUPER_ADMIN, table Pricing) uniquement.
    // Le fallback historique sur Association.expenseValidationThreshold a
    // été retiré : ce champ global était écrasé de façon incohérente selon
    // l'onglet de devise actif au moment de la sauvegarde des réglages, ce
    // qui produisait un seuil "au hasard" pour toute devise non explicitement
    // configurée dans Pricing. Le seuil par devise doit être une décision
    // explicite du SUPER_ADMIN pour CETTE devise (ex : France = 150€,
    // Guinée = 1 000 000 GNF).
    const pricing = await this.prisma.pricing.findFirst({
      where: {
        associationId: association.id,
        currency: currencyToUse
      }
    });

    const threshold: number | null =
      pricing && pricing.expenseValidationThreshold !== null && pricing.expenseValidationThreshold !== undefined
        ? Number(pricing.expenseValidationThreshold)
        : null;

    // Dès que le montant est supérieur OU ÉGAL au seuil, on bloque en attente de validation
    const isAboveThreshold = threshold !== null && Number(dto.amount) >= threshold;
    const initialStatus = isAboveThreshold ? ExpenseStatus.PENDING_VALIDATION : ExpenseStatus.VALIDATED;

    const expense = await this.prisma.expense.create({
      data: {
        associationId: association.id,
        antennaId: antenna.id,
        engagedByUserId: adminUserId,
        amount: dto.amount,
        currency: currencyToUse,
        category: dto.category as ExpenseCategory,
        title: dto.title,
        description: dto.description,
        expenseDate: new Date(dto.expenseDate),
        paymentMethod: dto.paymentMethod || 'OTHER',
        proofFileId: dto.proofFileId,
        status: initialStatus,
        validatedAt: initialStatus === ExpenseStatus.VALIDATED ? new Date() : null,
      }
    });

    // Si la dépense est validée (sous le seuil), on l'impute au solde immédiatement
    if (initialStatus === ExpenseStatus.VALIDATED) {
      await this.prisma.ledgerEntry.create({
        data: {
          associationId: association.id,
          antennaId: antenna.id,
          type: LedgerEntryType.ANTENNA_EXPENSE_OUT,
          amount: dto.amount,
          currency: expense.currency,
          title: `Dépense: ${expense.title}`,
          effectiveDate: expense.expenseDate,
          expenseId: expense.id,
          createdByUserId: adminUserId,
        }
      });
    } else {
      await this.notifications.notifySuperAdminsWithPush(
        association.id,
        `Une dépense de ${expense.amount} ${expense.currency} pour l'antenne "${antenna.name}" nécessite votre validation.`,
        NotificationType.EXPENSE_REQUIRES_VALIDATION,
        '⚠️ Validation de dépense requise'
      );
    }

    return expense;
  }

  // 🔥 CORRECTIF : ajout des filtres category et q (recherche par titre),
  // déjà envoyés par le frontend (admin/expenses/page.tsx) mais jamais lus
  // ici — les filtres "Recherche" et "Catégorie" de cette page n'avaient
  // donc strictement aucun effet.
  async listAntennaExpenses(adminUserId: string, page = 1, pageSize = 20, status?: string, category?: string, q?: string) {
    const assignment = await this.prisma.antennaAdminAssignment.findFirst({
      where: { adminUserId, isActive: true },
    });
    if (!assignment) throw new ForbiddenException("Accès refusé.");

    const where: Prisma.ExpenseWhereInput = {
      antennaId: assignment.antennaId,
      associationId: assignment.associationId, // 🔥 CLOISONNEMENT
      ...(status ? { status: status as ExpenseStatus } : {}),
      ...(category ? { category: category as ExpenseCategory } : {}),
      ...(q ? { title: { contains: q, mode: 'insensitive' } } : {}),
    };

    const [total, items] = await Promise.all([
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { engagedByUser: { select: { firstName: true, lastName: true, email: true } } }
      })
    ]);

    return { items, total, page, pageSize };
  }

  async deleteAntennaExpense(adminUserId: string, associationId: string, expenseId: string) {
    // 🔥 CLOISONNEMENT : On vérifie l'ID, l'auteur ET l'association
    const expense = await this.prisma.expense.findFirst({ 
      where: { id: expenseId, associationId, engagedByUserId: adminUserId } 
    });

    if (!expense) {
      throw new NotFoundException("Dépense introuvable ou vous n'avez pas les droits.");
    }

    if (expense.status === ExpenseStatus.VALIDATED) {
      throw new BadRequestException("Impossible de supprimer une dépense déjà validée.");
    }

    // Pas de LedgerEntry à nettoyer ici : seule une dépense VALIDATED en
    // possède une, et le garde ci-dessus exclut déjà ce cas de ce chemin.
    return this.prisma.expense.delete({ where: { id: expenseId } });
  }

  // ==========================================
  // LOGIQUE SUPER ADMIN
  // ==========================================

  async listSuperAdminExpenses(associationId: string, page = 1, pageSize = 20, status?: string, antennaId?: string, startDate?: string, endDate?: string) {
    // 🔥 CLOISONNEMENT STRICT : associationId est requis
    const where: Prisma.ExpenseWhereInput = {
      associationId,
      ...(status ? { status: status as ExpenseStatus } : {}),
      ...(antennaId ? { antennaId } : {})
    };

    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) {
        where.expenseDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.expenseDate.lte = end;
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          antenna: { select: { name: true } },
          engagedByUser: { select: { firstName: true, lastName: true, email: true } }
        }
      })
    ]);

    return { items, total, page, pageSize };
  }

  async validateExpense(superAdminId: string, associationId: string, expenseId: string) {
    const expense = await this.prisma.expense.findFirst({ 
      where: { id: expenseId, associationId } 
    });

    if (!expense) throw new NotFoundException("Dépense introuvable dans votre association.");

    if (expense.status !== ExpenseStatus.PENDING_VALIDATION) {
      throw new BadRequestException("Cette dépense n'est pas en attente de validation.");
    }

    const [updatedExpense] = await this.prisma.$transaction([
      this.prisma.expense.update({
        where: { id: expenseId },
        data: {
          status: ExpenseStatus.VALIDATED,
          validatedByUserId: superAdminId,
          validatedAt: new Date()
        }
      }),
      this.prisma.ledgerEntry.create({
        data: {
          associationId: expense.associationId,
          antennaId: expense.antennaId,
          type: LedgerEntryType.ANTENNA_EXPENSE_OUT,
          amount: expense.amount,
          currency: expense.currency,
          title: `Dépense validée: ${expense.title}`,
          effectiveDate: expense.expenseDate,
          expenseId: expense.id,
          createdByUserId: superAdminId,
        }
      })
    ]);

    await this.notifications.createForUserWithPush({
      associationId: updatedExpense.associationId,
      userId: updatedExpense.engagedByUserId,
      type: NotificationType.EXPENSE_VALIDATED,
      title: 'Dépense validée',
      message: `Votre demande de dépense de ${updatedExpense.amount} ${updatedExpense.currency} ("${updatedExpense.title}") a été validée.`,
      pushTitle: '✅ Dépense validée',
      pushBody: `${updatedExpense.title} (${updatedExpense.amount} ${updatedExpense.currency}) a été approuvée.`
    });

    return { message: "Dépense validée avec succès", expense: updatedExpense };
  }

  async rejectExpense(superAdminId: string, associationId: string, expenseId: string, reason: string) {
    const expense = await this.prisma.expense.findFirst({ 
      where: { id: expenseId, associationId } 
    });

    if (!expense) throw new NotFoundException("Dépense introuvable.");

    if (expense.status !== ExpenseStatus.PENDING_VALIDATION) {
      throw new BadRequestException("Cette dépense n'est pas en attente de validation.");
    }

    const updated = await this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        status: ExpenseStatus.REJECTED,
        rejectionReason: reason,
        validatedByUserId: superAdminId,
        validatedAt: new Date()
      }
    });

    await this.notifications.createForUserWithPush({
      associationId: updated.associationId,
      userId: updated.engagedByUserId,
      type: NotificationType.EXPENSE_REJECTED,
      title: 'Dépense refusée',
      message: `Votre demande de dépense de ${updated.amount} ${updated.currency} ("${updated.title}") a été refusée. Motif: ${reason}`,
      pushTitle: '❌ Dépense refusée',
      pushBody: `Motif : ${reason}`
    });

    return { message: "Dépense rejetée.", expense: updated };
  }

  // 🔒 CORRECTIF : si la dépense est déjà VALIDATED (donc possède une
  // LedgerEntry) et que le montant change, la LedgerEntry est resynchronisée
  // dans la même transaction — sinon le solde de l'antenne divergeait
  // silencieusement du montant réellement affiché sur la dépense.
  async updateSuperAdminExpense(expenseId: string, associationId: string, dto: {
    title?: string;
    amount?: number;
    category?: ExpenseCategory;
    expenseDate?: string;
    paymentMethod?: PaymentMethod;
    description?: string;
  }) {
    const expense = await this.prisma.expense.findFirst({ where: { id: expenseId, associationId } });
    if (!expense) throw new NotFoundException("Dépense introuvable.");

    const newAmount = dto.amount !== undefined ? new Prisma.Decimal(dto.amount) : expense.amount;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.expense.update({
        where: { id: expenseId },
        data: {
          title: dto.title,
          amount: newAmount,
          category: dto.category,
          expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined,
          paymentMethod: dto.paymentMethod,
          description: dto.description,
        }
      });

      if (expense.status === ExpenseStatus.VALIDATED && dto.amount !== undefined) {
        const linkedEntry = await tx.ledgerEntry.findFirst({ where: { expenseId: expense.id } });
        if (linkedEntry) {
          await tx.ledgerEntry.update({
            where: { id: linkedEntry.id },
            data: { amount: newAmount, title: `Dépense: ${updated.title}` },
          });
        }
      }

      return updated;
    });
  }

  // 🔒 CORRECTIF : suppression explicite de la LedgerEntry associée avant
  // celle de la dépense, dans une transaction — indépendant de la config
  // onDelete réellement appliquée sur la relation (jamais confirmée dans le
  // schema fourni), pour garantir que le solde de l'antenne ne garde jamais
  // une déduction fantôme après suppression d'une dépense déjà validée.
  async deleteSuperAdminExpense(expenseId: string, associationId: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id: expenseId, associationId } });
    if (!expense) throw new NotFoundException("Dépense introuvable.");

    await this.prisma.$transaction(async (tx) => {
      const linkedEntry = await tx.ledgerEntry.findFirst({ where: { expenseId: expense.id } });
      if (linkedEntry) {
        await tx.ledgerEntry.delete({ where: { id: linkedEntry.id } });
      }
      await tx.expense.delete({ where: { id: expenseId } });
    });

    return { message: 'Dépense supprimée avec succès.' };
  }

  // ==========================================
  // LOGIQUE MEMBRE (Lecture seule / Transparence)
  // ==========================================
  async listMemberExpenses(userId: string, associationId: string, page = 1, pageSize = 20, category?: string) {
    const where: Prisma.ExpenseWhereInput = {
      associationId,
      status: ExpenseStatus.VALIDATED,
      ...(category ? { category: category as ExpenseCategory } : {})
    };

    const [total, items] = await Promise.all([
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { antenna: { select: { name: true } } }
      })
    ]);

    return { items, total, page, pageSize };
  }
}