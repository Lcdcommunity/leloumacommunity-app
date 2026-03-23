//backend/src/modules/auth/dto/refresh-token.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}