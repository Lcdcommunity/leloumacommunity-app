//backend/src/modules/notifications/dto/notifications-query.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class NotificationsQueryDto {
  @IsOptional()
  @Transform(({ value }) => String(value))
  @IsString()
  @MaxLength(50)
  type?: string;

  @IsOptional()
  @Transform(({ value }) => String(value))
  @IsString()
  @MaxLength(10)
  status?: string; // si tu as DeliveryStatus, sinon ignore
}