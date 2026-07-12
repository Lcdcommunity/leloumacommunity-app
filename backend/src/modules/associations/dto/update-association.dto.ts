// backend/src/modules/associations/dto/update-association.dto.ts
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAssociationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  legalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  registrationNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  websiteUrl?: string; 

  @IsOptional()
  @IsString()
  @MaxLength(150)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  defaultCurrency?: string;

  // 🔒 RETIRÉ : isActive (SYSTEM_ADMIN uniquement)

  @IsOptional()
  @IsString()
  logoFileId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La date de fondation doit être valide (YYYY-MM-DD)' })
  foundedAt?: string;

  // 🔒 RETIRÉ : expenseValidationThreshold — exclusivement par devise
  // désormais (table Pricing), voir expenses.service.ts.
}