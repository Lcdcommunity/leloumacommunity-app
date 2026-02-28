//backend/src/modules/audit/dto/create-audit-log.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAuditLogDto {
  @IsString()
  @MaxLength(80)
  action!: string; // ex: "CONTRIBUTION_CREATED"

  @IsOptional()
  @IsString()
  @MaxLength(80)
  targetType?: string; // ex: "Contribution"

  @IsOptional()
  @IsString()
  @MaxLength(120)
  targetId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  actorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  associationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  antennaId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;

  @IsOptional()
  metadata?: unknown; // si ton schéma Prisma a un Json
}