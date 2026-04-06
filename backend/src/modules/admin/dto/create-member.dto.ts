//backend/src/modules/admin/dto/create-member.dto.ts
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMemberDto {
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsEmail()
  email!: string;

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
  originSubPrefecture?: string;
  
  @IsOptional()
  @IsString()
  originVillage?: string;

  @IsOptional()
  @IsString()
  professionalStatus?: string;

  @IsOptional()
  @IsString()
  function?: string;
}