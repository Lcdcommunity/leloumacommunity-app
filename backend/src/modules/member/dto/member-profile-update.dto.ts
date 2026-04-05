//backend/src/modules/member/dto/member-profile-update.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class MemberProfileUpdateDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  // 🔥 AJOUTS DES CHAMPS MANQUANTS POUR LA SAUVEGARDE DU PROFIL
  @IsOptional()
  @IsString()
  @MaxLength(120)
  function?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  professionalStatus?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  originSubPrefecture?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  placeOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  countryOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  postalCode?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;
}