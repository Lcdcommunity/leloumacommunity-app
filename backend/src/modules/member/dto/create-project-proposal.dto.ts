///////// backend/src/modules/member/dto/create-project-proposal.dto.ts
import {
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CurrencyCode } from '@prisma/client';

// 🔥 AJOUT : Le membre peut sauvegarder en brouillon (DRAFT) ou soumettre (SUBMITTED)
export enum ProposalInitialStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
}

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
  @IsString()
  attachmentFileAssetId?: string | null;

  // 🔥 NOUVEAU : Statut initial — DRAFT (brouillon) ou SUBMITTED (soumis à l'admin)
  @IsOptional()
  @IsEnum(ProposalInitialStatus)
  status?: ProposalInitialStatus;
}