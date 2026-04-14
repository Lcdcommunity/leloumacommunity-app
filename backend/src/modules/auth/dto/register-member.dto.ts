// src/modules/auth/dto/register-member.dto.ts
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterMemberDto {
  @IsString()
  associationCode!: string;

  @IsString()
  antennaCode!: string;

  // ⚡ Ajouté car le frontend envoie spécifiquement antennaId dans le FormData
  @IsOptional()
  @IsString()
  antennaId?: string;

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
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  postalCode?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsOptional()
  @IsString()
  termsAccepted?: string;
}