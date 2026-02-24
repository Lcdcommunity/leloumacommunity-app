//src/modules/contributions/dto/validate-contribution.dto.ts
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ValidationChannel } from '@prisma/client';

export class ValidateContributionDto {
  @IsOptional()
  @IsString()
  adminComment?: string;

  @IsOptional()
  @IsEnum(ValidationChannel)
  validationChannel?: ValidationChannel;
}