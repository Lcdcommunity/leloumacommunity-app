//backend/src/modules/member/dto/create-member-contribution.dto.ts
import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateMemberContributionDto {
  @IsNumber()
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

  // 🔥 NOUVEAU : Identifiant du membre pour qui on paie
  @IsOptional()
  @IsString()
  targetMemberId?: string;
}