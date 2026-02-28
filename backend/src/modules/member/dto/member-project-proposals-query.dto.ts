//backend/src/modules/member/dto/member-project-proposals-query.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from './pagination-query.dto';

export class MemberProjectProposalsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  status?: string;
}