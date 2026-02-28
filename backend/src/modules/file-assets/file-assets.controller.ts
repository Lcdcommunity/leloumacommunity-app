//backend/src/modules/file-assets/file-assets.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { multerDiskStorage } from './storage/multer.config';
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
      storage: multerDiskStorage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async upload(
    @CurrentUser() user: AuthUser, // <-- On récupère l'utilisateur
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: CreateFileAssetDto,
  ) {
    if (!file) {
      return { error: 'NO_FILE' };
    }

    return this.service.createFromUpload({
      associationId: user.associationId, // <-- On passe l'ID ici
      storedFileName: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      label: dto.label,
    });
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getById(id);
  }
}