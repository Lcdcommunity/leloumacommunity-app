//backend/src/modules/member/dto/member-contributions-query.sto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class MemberContributionsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;
}