//backend/src/modules/file-assets/dto/file-assets-query.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class FileAssetsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;
}