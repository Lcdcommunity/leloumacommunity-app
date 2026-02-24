//src/modules/contributions/dto/reject-contribution.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class RejectContributionDto {
  @IsString()
  rejectionReason!: string;

  @IsOptional()
  @IsString()
  adminComment?: string;
}