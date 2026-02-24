//src/modules/users/dto/create-admin-user.dto.ts
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAdminUserDto {
  @IsString()
  associationId!: string;

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
}