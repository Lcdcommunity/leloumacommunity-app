// backend/src/modules/expenses/expenses.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExpenseStatus, LedgerEntryType, UserRole, ExpenseCategory, CurrencyCode, Prisma } from '@prisma/client';
import { CreateExpenseDto, RejectExpenseDto } from './dto/expense.dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

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
    const threshold = association.expenseValidationThreshold ? Number(association.expenseValidationThreshold) : null;
    const isAboveThreshold = threshold !== null && dto.amount >= threshold;

    const initialStatus = isAboveThreshold ? ExpenseStatus.PENDING_VALIDATION : ExpenseStatus.VALIDATED;

    const expense = await this.prisma.expense.create({
      data: {
        associationId: association.id,
        antennaId: antenna.id,
        engagedByUserId: adminUserId,
        amount: dto.amount,
        currency: (dto.currency || antenna.defaultCurrency || 'EUR') as CurrencyCode,
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

  async listSuperAdminExpenses(associationId: string, page = 1, pageSize = 20, status?: string, antennaId?: string) {
    // 🔥 CLOISONNEMENT STRICT : associationId est requis
    const where: Prisma.ExpenseWhereInput = {
      associationId,
      ...(status ? { status: status as ExpenseStatus } : {}),
      ...(antennaId ? { antennaId } : {})
    };

    const [total, items] = await Promise.all([
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        orderBy: { createdAt: 'desc' },
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

    return { message: "Dépense rejetée.", expense: updated };
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