// backend/src/modules/platform-wallet/dto/platform-wallet.dto.ts
//
// v1.0 — DTOs du wallet plateforme. Le ValidationPipe global est en
//   forbidNonWhitelisted : chaque champ accepté est décoré.
//
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CurrencyCode, TransferStatus } from '@prisma/client';
import { MANUAL_WALLET_TYPES, MAX_AMOUNT } from '../platform-wallet.constants';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);

export class CreatePlatformTransferDto {
  @IsOptional() @IsString() @MaxLength(64)
  senderAntennaId?: string;

  @Transform(upper)
  @IsEnum(CurrencyCode, { message: 'Devise inconnue.' })
  currency: CurrencyCode;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false }, { message: 'Montant invalide (2 décimales au maximum).' })
  @IsPositive({ message: 'Le montant doit être positif.' })
  @Max(MAX_AMOUNT, { message: 'Montant trop élevé.' })
  amount: number;

  /** Période concernée par la commission, ex. « Septembre 2026 » (libre). */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(60)
  periodLabel?: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(500)
  notes?: string;

  /** Clé choisie par le client (UUID) : rejouer la même requête ne crée pas de doublon. */
  @IsOptional() @IsString() @Matches(/^[A-Za-z0-9_-]{8,80}$/, { message: 'idempotencyKey invalide.' })
  idempotencyKey?: string;
}

export class RejectPlatformTransferDto {
  @Transform(trim)
  @IsString() @MinLength(3, { message: 'Précise le motif (3 caractères minimum).' }) @MaxLength(500)
  reason: string;
}

export class ListPlatformTransfersQueryDto {
  @IsOptional() @IsEnum(TransferStatus) status?: TransferStatus;
  @IsOptional() @Transform(upper) @IsEnum(CurrencyCode) currency?: CurrencyCode;
  @IsOptional() @IsString() @MaxLength(64) antennaId?: string;
  @IsOptional() @IsString() @MaxLength(64) associationId?: string;
  /** Recherche sur la référence ou le nom d'association / d'antenne. */
  @IsOptional() @Transform(trim) @IsString() @MaxLength(80) q?: string;
  @IsOptional() @Type(() => Number) @IsNumber() page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() pageSize?: number;
}

export class ListWalletEntriesQueryDto {
  @IsOptional() @Transform(upper) @IsEnum(CurrencyCode) currency?: CurrencyCode;
  @IsOptional() @IsString() @MaxLength(30) type?: string;
  @IsOptional() @IsString() @MaxLength(64) associationId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
  @IsOptional() @Type(() => Number) @IsNumber() page?: number;
  @IsOptional() @Type(() => Number) @IsNumber() pageSize?: number;
}

export class CreateWalletMovementDto {
  @IsIn([...MANUAL_WALLET_TYPES], { message: 'Type de mouvement inconnu.' })
  type: (typeof MANUAL_WALLET_TYPES)[number];

  @Transform(upper)
  @IsEnum(CurrencyCode, { message: 'Devise inconnue.' })
  currency: CurrencyCode;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2, allowNaN: false, allowInfinity: false })
  @IsPositive()
  @Max(MAX_AMOUNT, { message: 'Montant trop élevé.' })
  amount: number;

  @Transform(trim)
  @IsString() @MinLength(3) @MaxLength(120)
  title: string;

  @IsOptional() @Transform(trim) @IsString() @MaxLength(500)
  description?: string;

  @IsOptional() @IsDateString()
  effectiveDate?: string;

  @IsOptional() @IsString() @Matches(/^[A-Za-z0-9_-]{8,80}$/, { message: 'idempotencyKey invalide.' })
  idempotencyKey?: string;
}

export class UpdateWalletSettingsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(10)
  @Transform(({ value }) => (Array.isArray(value) ? value.map((v) => (typeof v === 'string' ? v.trim().toUpperCase() : v)) : value))
  @IsEnum(CurrencyCode, { each: true, message: 'Devise inconnue.' })
  currencies: CurrencyCode[];
}
