//backend/src/modules/member/dto/member-projects-query.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class MemberProjectsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}