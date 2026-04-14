// backend/src/modules/expenses/expenses.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExpenseStatus, LedgerEntryType, UserRole, ExpenseCategory, CurrencyCode, Prisma, NotificationType } from '@prisma/client';
import { CreateExpenseDto, RejectExpenseDto } from './dto/expense.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ExpensesService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService, // 🔥 AJOUT CHIRURGICAL : Injection du service de notifications
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

    // 1. Tenter de récupérer le seuil configuré par devise (Table Pricing)
    const pricing = await this.prisma.pricing.findFirst({
      where: {
        associationId: association.id,
        currency: currencyToUse
      }
    });

    let threshold: number | null = null;

    if (pricing && pricing.expenseValidationThreshold !== null && pricing.expenseValidationThreshold !== undefined) {
      threshold = Number(pricing.expenseValidationThreshold);
    } 
    // 2. FALLBACK CRUCIAL : Si non trouvé dans Pricing, on cherche sur la table Association
    else if (association.expenseValidationThreshold !== null && association.expenseValidationThreshold !== undefined) {
      threshold = Number(association.expenseValidationThreshold);
    }

    // 🔥 LOGS DE DEBUGGING POUR LE TERMINAL DU BACKEND 🔥
    console.log('\n--- DEBUG VALIDATION DÉPENSE ---');
    console.log('1. Montant demandé :', dto.amount);
    console.log('2. Seuil Pricing trouvé en BDD :', pricing?.expenseValidationThreshold);
    console.log('3. Seuil Association trouvé en BDD :', association.expenseValidationThreshold);
    console.log('4. Seuil final appliqué pour le test :', threshold);
    console.log('--------------------------------\n');

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
      // 🔥 AJOUT CHIRURGICAL : Si au-dessus du seuil, on notifie les Super Admins (In-App + Push)
      await this.notifications.notifySuperAdminsWithPush(
        association.id,
        `Une dépense de ${expense.amount} ${expense.currency} pour l'antenne "${antenna.name}" nécessite votre validation.`,
        NotificationType.EXPENSE_REQUIRES_VALIDATION,
        '⚠️ Validation de dépense requise'
      );
    }

    return expense;
  }

  async listAntennaExpenses(adminUserId: string, page = 1, pageSize = 20, status?: string) {
    const assignment = await this.prisma.antennaAdminAssignment.findFirst({
      where: { adminUserId, isActive: true },
    });
    if (!assignment) throw new ForbiddenException("Accès refusé.");

    const where: Prisma.ExpenseWhereInput = {
      antennaId: assignment.antennaId,
      associationId: assignment.associationId, // 🔥 CLOISONNEMENT
      ...(status ? { status: status as ExpenseStatus } : {})
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

    // Gestion du filtre par période de date
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
    // 🔥 CLOISONNEMENT : On vérifie que la dépense appartient à l'asso du Super Admin
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

    // 🔥 AJOUT CHIRURGICAL : Notifie l'admin d'antenne que sa dépense est validée (In-App + Push)
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
    // 🔥 CLOISONNEMENT
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

    // 🔥 AJOUT CHIRURGICAL : Notifie l'admin d'antenne du rejet (In-App + Push)
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

  async updateSuperAdminExpense(expenseId: string, associationId: string, dto: any) {
    const expense = await this.prisma.expense.findFirst({ where: { id: expenseId, associationId } });
    if (!expense) throw new NotFoundException("Dépense introuvable.");

    return this.prisma.expense.update({
      where: { id: expenseId },
      data: {
        title: dto.title,
        amount: dto.amount,
        category: dto.category,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined,
        paymentMethod: dto.paymentMethod,
        description: dto.description
      }
    });
  }

  async deleteSuperAdminExpense(expenseId: string, associationId: string) {
    const expense = await this.prisma.expense.findFirst({ where: { id: expenseId, associationId } });
    if (!expense) throw new NotFoundException("Dépense introuvable.");

    // Note : Prisma se chargera de supprimer la LedgerEntry associée si la relation onDelete Cascade est bien paramétrée. 
    // Sinon, on supprime explicitement la dépense.
    return this.prisma.expense.delete({ where: { id: expenseId } });
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