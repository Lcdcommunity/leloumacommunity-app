//src/modules/contributions/dto/create-contribution.dto.ts
//
// v1.1 — 🔥 CORRIGÉ : `amount` (chaîne) n'était contrôlé que par @IsString :
//   « abc », « -50 » ou « 1e99 » passaient la validation (NaN / négatif / 500).
//   Format imposé : nombre décimal strictement positif, 12 chiffres max avant la
//   virgule et 2 décimales max (colonne Decimal(14,2)), point comme séparateur.
//
import { CurrencyCode, PaymentMethod, ContributionPurpose } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateContributionDto {
  @IsString()
  antennaId!: string;

  @IsString()
  @Matches(/^(?!0+(\.0+)?$)\d{1,12}(\.\d{1,2})?$/, {
    message: 'Le montant doit être un nombre strictement positif (2 décimales maximum).',
  })
  amount!: string; // Decimal string

  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsEnum(ContributionPurpose)
  purpose?: ContributionPurpose;

  @IsOptional()
  @IsDateString()
  contributionDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  monthReference?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  yearReference?: number;

  @IsOptional()
  @IsString()
  memberComment?: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  proofFileId?: string;

  // 👇 AJOUTS CHIRURGICAUX : Pour que NestJS ne supprime pas les données envoyées par ton Frontend
  @IsOptional()
  @IsString()
  targetMemberId?: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsOptional()
  @IsString()
  depositedAt?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  receiptFileAssetId?: string;
}