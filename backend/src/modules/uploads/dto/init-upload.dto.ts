//src/modules/uploads/dto/init-upload.dto.ts
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class InitUploadDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  folder?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}