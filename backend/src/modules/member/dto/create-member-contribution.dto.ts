// backend/src/modules/member/dto/create-member-contribution.dto.ts
//
// v1.1 — 🔥 CORRIGÉ : `amount` n'avait que @IsNumber : un membre pouvait déclarer
//   un versement négatif ou nul (puis, une fois validé par un admin, le ledger
//   recevait un montant négatif) ou supérieur à la capacité Decimal(14,2)
//   (erreur 500). Ajout de @IsPositive et @Max.
//
import { IsNumber, IsOptional, IsString, IsInt, Min, IsPositive, Max } from 'class-validator';

export class CreateMemberContributionDto {
  @IsNumber()
  @IsPositive({ message: 'Le montant doit être strictement positif.' })
  @Max(999999999999.99, { message: 'Montant trop élevé.' })
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

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
  purpose?: string;

  @IsOptional()
  @IsString()
  receiptFileAssetId?: string;

  @IsOptional()
  @IsString()
  targetMemberId?: string;

  // 🔥 AJOUT CHIRURGICAL
  @IsOptional()
  @IsInt()
  @Min(1)
  monthReference?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  yearReference?: number;
}