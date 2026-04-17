/////// backend/src/modules/super-admin/dto/create-antenna-admin.dto.ts
import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateAntennaAdminDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty({ message: 'Vous devez sélectionner au moins une antenne.' })
  antennaIds!: string[];

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
  function?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  professionalStatus?: string;

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