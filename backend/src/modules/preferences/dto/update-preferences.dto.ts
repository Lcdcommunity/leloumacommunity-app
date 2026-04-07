//backend/src/modules/preferences/dto/update-preferences.dto.ts
import { IsBoolean, IsOptional, IsString, IsIn } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  smsNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['fr', 'en', 'es', 'pt', 'ff', 'ar'])
  language?: string;

  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark', 'system'])
  theme?: string;
}