// backend/src/modules/admin-member-contributions/dto/create-contribution-for-member.dto.ts
//
// v1.1 — 🔥 CORRIGÉ : ajout de @Max(999999999999.99) sur `amount` (colonne
//   Decimal(14,2)) : au-delà, l'écriture échouait en erreur 500.
//
//
// DTO pour la cotisation enregistrée par un admin au nom d'un membre
// (membres illettrés ne pouvant pas utiliser l'outil eux-mêmes).
// Même forme que CreateMemberContributionDto (module member), + memberId
// obligatoire puisque c'est l'admin qui désigne le bénéficiaire.
//
import {
  CurrencyCode,
  PaymentMethod,
  ContributionPurpose,
} from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, Min, Max } from 'class-validator';

export class CreateContributionForMemberDto {
  @IsNotEmpty()
  @IsString()
  memberId!: string;

  @IsNumber()
  @IsPositive()
  @Max(999999999999.99, { message: 'Montant trop élevé.' })
  amount!: number;

  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @IsOptional()
  @IsEnum(ContributionPurpose)
  purpose?: ContributionPurpose;

  @IsOptional()
  @IsDateString()
  depositedAt?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  monthReference?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  yearReference?: number;
}