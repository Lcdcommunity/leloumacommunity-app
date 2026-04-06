import { IsString, IsNotEmpty, IsObject, IsOptional } from 'class-validator';

class PushKeysDto {
  @IsString()
  @IsNotEmpty()
  p256dh: string;

  @IsString()
  @IsNotEmpty()
  auth: string;
}

export class PushSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  endpoint: string;

  @IsOptional()
  expirationTime?: number;

  @IsObject()
  @IsNotEmpty()
  keys: PushKeysDto;
}