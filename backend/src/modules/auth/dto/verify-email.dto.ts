//src/modules/auth/dto/verify-email.dto.ts
import { IsString, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @MinLength(10)
  token!: string;
}