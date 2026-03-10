//src/modules/contributions/dto/create-contribution.dto.ts
import { CurrencyCode, PaymentMethod, ContributionPurpose } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateContributionDto {
  @IsString()
  antennaId!: string;

  @IsString()
  amount!: string; // Decimal string

  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  // 👇 AJOUT CHIRURGICAL ICI AUSSI 👇
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
}