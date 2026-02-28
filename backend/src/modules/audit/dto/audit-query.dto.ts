//backend/src/modules/audit/dto/audit-query.dto.ts
import { Transform } from 'class-transformer';
import { IsISO8601, IsOptional, IsString, MaxLength } from 'class-validator';
import { AuditPaginationDto } from './audit-pagination.dto';

export class AuditQueryDto extends AuditPaginationDto {
  /**
   * Filtrer par action (ex: USER_CREATED, CONTRIBUTION_VALIDATED, etc.)
   */
  @IsOptional()
  @Transform(({ value }) => String(value))
  @IsString()
  @MaxLength(80)
  action?: string;

  /**
   * Filtrer par cible (type) : USER / CONTRIBUTION / PROJECT / etc.
   */
  @IsOptional()
  @Transform(({ value }) => String(value))
  @IsString()
  @MaxLength(80)
  targetType?: string;

  /**
   * Filtrer par id cible (targetId)
   */
  @IsOptional()
  @Transform(({ value }) => String(value))
  @IsString()
  @MaxLength(120)
  targetId?: string;

  /**
   * Filtrer par user qui a fait l’action (actorId)
   */
  @IsOptional()
  @Transform(({ value }) => String(value))
  @IsString()
  @MaxLength(120)
  actorId?: string;

  /**
   * Scope multi-tenant / association / antenna si tu les as
   */
  @IsOptional()
  @Transform(({ value }) => String(value))
  @IsString()
  @MaxLength(120)
  associationId?: string;

  @IsOptional()
  @Transform(({ value }) => String(value))
  @IsString()
  @MaxLength(120)
  antennaId?: string;

  /**
   * Période
   */
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  /**
   * Recherche texte (dans message, actor email, metadata… selon service)
   */
  @IsOptional()
  @Transform(({ value }) => String(value))
  @IsString()
  @MaxLength(200)
  q?: string;
}