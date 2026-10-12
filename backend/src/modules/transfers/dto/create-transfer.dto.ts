// backend/src/modules/transfers/dto/create-transfer.dto.ts
//
// v1.1 — 🔥 CORRIGÉ : ajout de @Max(999999999999.99) sur les montants (colonne
//   Decimal(14,2)) : au-delà, l'écriture échouait en erreur 500 au lieu d'un 400.
//
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsString, Max } from 'class-validator';

export class CreateTransferDto {
  @IsString()
  @IsOptional()
  senderAntennaId?: string;

  @IsString()
  receiverAntennaId: string;

  @IsNumber()
  @IsPositive()
  @Max(999999999999.99, { message: 'Montant trop élevé.' })
  @Type(() => Number)
  sendAmount: number;

  @IsNumber()
  @IsPositive()
  @Max(999999999999.99, { message: 'Montant trop élevé.' })
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

// 🔥 NOUVEAU : modification d'un virement encore PENDING_VALIDATION par l'antenne expéditrice
export class UpdateTransferDto {
  @IsNumber()
  @IsPositive()
  @Max(999999999999.99, { message: 'Montant trop élevé.' })
  @Type(() => Number)
  @IsOptional()
  sendAmount?: number;

  @IsNumber()
  @IsPositive()
  @Max(999999999999.99, { message: 'Montant trop élevé.' })
  @Type(() => Number)
  @IsOptional()
  receiveAmount?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}