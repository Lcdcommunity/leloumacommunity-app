// backend/src/modules/associations/dto/update-association.dto.ts
import { IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CurrencyCode } from '@prisma/client';

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

  // 🔥 CORRECTION : IsString() seul laissait passer n'importe quelle chaîne
  // (ex. "BANANA") — associations.service.ts la force-castait ensuite en
  // CurrencyCode sans vérification, et c'est Postgres qui finissait par
  // rejeter la valeur avec une 500 brute au lieu d'un message de validation
  // propre. IsEnum valide contre les vraies valeurs de CurrencyCode.
  @IsOptional()
  @IsEnum(CurrencyCode, { message: 'Devise invalide.' })
  defaultCurrency?: CurrencyCode;

  // 🔒 RETIRÉ : isActive (SYSTEM_ADMIN uniquement)

  @IsOptional()
  @IsString()
  logoFileId?: string;

  // 🔥 CORRECTION : foundedAt retiré — n'existe pas comme colonne sur
  // Association dans schema.prisma. Le champ passait la validation (IsDateString
  // ne vérifie que le format) mais n'était jamais écrit par updateCurrent()
  // (ligne manquante dans le data: {}) : envoyer une date ne renvoyait aucune
  // erreur mais ne sauvegardait jamais rien, silencieusement.

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  originLocalities?: string[];

  // 🔒 RETIRÉ : expenseValidationThreshold — exclusivement par devise
  // désormais (table Pricing), voir expenses.service.ts.
}