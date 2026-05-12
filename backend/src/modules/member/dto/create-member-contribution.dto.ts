import { IsNumber, IsOptional, IsString, IsInt, Min } from 'class-validator';

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