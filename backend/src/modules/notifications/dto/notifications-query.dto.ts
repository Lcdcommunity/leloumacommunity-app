// backend/src/modules/notifications/dto/notifications-query.dto.ts
import { IsOptional, IsNumber, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '@prisma/client';

export class NotificationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 20;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;
}