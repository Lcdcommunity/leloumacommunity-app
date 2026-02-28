//backend/src/modules/member/dto/member-preferences-update.dto.ts
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class MemberPreferencesUpdateDto {
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
  @IsIn(['fr', 'en'])
  language?: string;

  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark', 'system'])
  theme?: 'light' | 'dark' | 'system';
}