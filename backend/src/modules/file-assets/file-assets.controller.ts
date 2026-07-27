// backend/src/modules/file-assets/file-assets.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { multerMemoryStorage } from './storage/multer.config';
import { FileAssetsService } from './file-assets.service';
import { CreateFileAssetDto } from './dto/create-file-asset.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';

@Controller('file-assets')
@UseGuards(JwtAuthGuard)
export class FileAssetsController {
  constructor(private readonly service: FileAssetsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multerMemoryStorage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async upload(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateFileAssetDto,
  ) {
    if (!file) {
      return { error: 'NO_FILE' };
    }

    return this.service.createFromUpload({
      associationId: user.associationId,
      fileBuffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      label: dto.label,
      category: dto.category,
    });
  }

  @Get(':id')
  getOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.getById(id, user.associationId);
  }

  @Delete(':id')
  deleteOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.delete(id, user.associationId);
  }
}