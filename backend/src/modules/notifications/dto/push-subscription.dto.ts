// backend/src/modules/notifications/dto/push-subscription.dto.ts
import { IsString, IsOptional, IsNumber, IsObject } from 'class-validator';

export class PushSubscriptionDto {
  @IsString()
  endpoint: string;

  @IsOptional()
  @IsNumber()
  expirationTime?: number | null;

  @IsObject()
  keys: {
    p256dh: string;
    auth: string;
  };
}