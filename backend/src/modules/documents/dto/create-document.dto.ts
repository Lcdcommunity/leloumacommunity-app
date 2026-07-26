// backend/src/modules/documents/dto/create-document.dto.ts
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  visibility?: string;

  @IsString()
  fileAssetId!: string;
}