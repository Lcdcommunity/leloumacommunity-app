//backend/src/modules/file-assets/dto/create-file-asset.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateFileAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;
}