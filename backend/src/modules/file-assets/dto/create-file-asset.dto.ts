//backend/src/modules/file-assets/dto/create-file-asset.dto.ts
import { IsOptional, IsString, MaxLength, IsEnum } from 'class-validator';
import { FileCategory } from '@prisma/client';

export class CreateFileAssetDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string;

  @IsOptional()
  @IsEnum(FileCategory)
  category?: FileCategory;
}