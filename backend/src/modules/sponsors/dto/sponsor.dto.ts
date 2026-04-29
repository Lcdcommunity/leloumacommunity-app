// backend/src/modules/sponsors/dto/sponsor.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUrl, IsEmail, IsEnum } from 'class-validator';
import { SponsorTier } from '@prisma/client';

export class CreateSponsorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUrl()
  @IsOptional()
  websiteUrl?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  logoFileId?: string;

  // ⚡ AJOUT CHIRURGICAL
  @IsString()
  @IsOptional()
  logoUrl?: string;

  // ⚡ AJOUT CHIRURGICAL
  @IsEnum(SponsorTier)
  @IsOptional()
  tier?: SponsorTier;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateSponsorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsUrl()
  @IsOptional()
  websiteUrl?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  logoFileId?: string;

  // ⚡ AJOUT CHIRURGICAL
  @IsString()
  @IsOptional()
  logoUrl?: string;

  // ⚡ AJOUT CHIRURGICAL
  @IsEnum(SponsorTier)
  @IsOptional()
  tier?: SponsorTier;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}