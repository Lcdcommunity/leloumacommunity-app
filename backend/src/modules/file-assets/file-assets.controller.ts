// backend/src/modules/file-assets/file-assets.controller.ts
//
// v1.1 — 🔥 CORRIGÉ (sécurité) : DELETE /file-assets/:id n'avait AUCUN contrôle
//   de rôle (seulement JwtAuthGuard) : n'importe quel MEMBRE pouvait supprimer
//   n'importe quel fichier de son association (justificatifs de cotisations,
//   pièces de dépenses…), y compris sur Cloudinary. Réservé aux administrateurs.
//   Le front web n'appelle pas cette route (vérifié) ; les uploads et lectures
//   restent ouverts à tout utilisateur authentifié, inchangés.
//
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
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
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
  @UseGuards(RolesGuard)
  @Roles(UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN)
  deleteOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.delete(id, user.associationId);
  }
}