//////// backend/src/modules/users/dto/update-me.dto.ts
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMeDto {
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
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La date de naissance doit être une date valide au format YYYY-MM-DD' })
  birthDate?: string;

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
  @MaxLength(120)
  originSubPrefecture?: string;

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
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  country?: string;
}