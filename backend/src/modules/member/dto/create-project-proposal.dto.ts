// backend/src/modules/member/dto/create-project-proposal.dto.ts
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CurrencyCode } from '@prisma/client';

export class CreateProjectProposalDto {
  @IsString()
  @MaxLength(180)
  title!: string;

  @IsString()
  @MaxLength(10000)
  description!: string;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value == null ? undefined : Number(value)))
  @IsNumber()
  @Min(0)
  expectedBudget?: number;

  @IsOptional()
  @IsEnum(CurrencyCode)
  currency?: CurrencyCode;

  @IsOptional()
  @IsUUID()
  attachmentFileAssetId?: string | null;
}