// backend/src/modules/auth/dto/member-signup.dto.ts
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class MemberSignupDto {
  @IsString()
  antennaId!: string;

  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  // ⚡ NOUVEAUX CHAMPS SYNCHRONISÉS AVEC LE FRONTEND
  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  function?: string;

  @IsOptional()
  @IsString()
  professionalStatus?: string;

  @IsOptional()
  @IsString()
  originSubPrefecture?: string;

  @IsOptional()
  @IsString()
  placeOfBirth?: string;

  @IsOptional()
  @IsString()
  birthCountry?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  termsAccepted?: string;
}