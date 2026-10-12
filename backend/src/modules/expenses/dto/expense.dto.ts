// backend/src/modules/expenses/dto/expense.dto.ts
//
// v1.1 — 🔥 CORRIGÉ : `amount` n'était contrôlé que par @IsNumber : un montant
//   négatif ou nul passait et s'inscrivait tel quel dans le ledger (une dépense
//   négative AUGMENTAIT le solde), et un montant > 999 999 999 999,99 faisait
//   échouer l'écriture Decimal(14,2) en erreur 500. Ajout de @IsPositive et
//   @Max alignés sur la colonne.
//
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsDateString, IsPositive, Max } from 'class-validator';
import { ExpenseCategory, PaymentMethod } from '@prisma/client';

export class CreateExpenseDto {
  @IsNumber()
  @IsPositive({ message: 'Le montant doit être strictement positif.' })
  @Max(999999999999.99, { message: 'Montant trop élevé.' })
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(ExpenseCategory)
  @IsNotEmpty()
  category: ExpenseCategory;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsNotEmpty()
  expenseDate: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  proofFileId?: string;
}

export class RejectExpenseDto {
  @IsString()
  @IsNotEmpty()
  rejectionReason: string;
}