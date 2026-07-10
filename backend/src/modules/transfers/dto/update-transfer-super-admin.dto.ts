// backend/src/modules/transfers/dto/update-transfer-super-admin.dto.ts
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class UpdateTransferSuperAdminDto {
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  @IsOptional()
  sendAmount?: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  @IsOptional()
  receiveAmount?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}