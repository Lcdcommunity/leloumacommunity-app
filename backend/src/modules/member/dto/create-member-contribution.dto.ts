//backend/src/modules/member/dto/create-member-contribution.dto.ts
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsEnum,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ContributionPurpose } from '@prisma/client';

export class CreateMemberContributionDto {
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  method?: string;

  // 👇 AJOUT CHIRURGICAL : Le backend accepte enfin la propriété purpose du frontend
  @IsOptional()
  @IsEnum(ContributionPurpose)
  purpose?: ContributionPurpose;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  reference?: string;

  @IsOptional()
  @IsDateString()
  depositedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;

  @IsOptional()
  @IsUUID()
  receiptFileAssetId?: string | null;
}