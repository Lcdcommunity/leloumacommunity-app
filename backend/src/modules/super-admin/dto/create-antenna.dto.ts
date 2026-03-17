//backend/src/modules/super-admin/dto/create-antenna.dto.ts
import { Type, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { CurrencyCode } from '@prisma/client';

class CreateEmbeddedAntennaAdminDto {
  @IsString()
  @MaxLength(120)
  firstName!: string;

  @IsString()
  @MaxLength(120)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  associationTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  originSubPrefecture?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  sendInvite?: boolean = true;
}

export class CreateAntennaDto {
  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

  @IsString()
  @MaxLength(160)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean = true;

  // NOUVEAU : Validation stricte pour la devise depuis le frontend
  @IsOptional()
  @IsEnum(CurrencyCode)
  defaultCurrency?: CurrencyCode;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateEmbeddedAntennaAdminDto)
  admin?: CreateEmbeddedAntennaAdminDto;
}