// backend/src/modules/transfers/dto/create-transfer.dto.ts
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateTransferDto {
  @IsString()
  @IsOptional()
  senderAntennaId?: string;

  @IsString()
  receiverAntennaId: string;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  sendAmount: number;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  receiveAmount: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RejectTransferDto {
  @IsString()
  reason: string;
}