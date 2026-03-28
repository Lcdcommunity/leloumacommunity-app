// backend/src/modules/sponsors/dto/sponsor.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUrl, IsEmail } from 'class-validator';

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

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}