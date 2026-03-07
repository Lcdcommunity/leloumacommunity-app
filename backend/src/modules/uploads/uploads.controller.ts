// backend/src/modules/uploads/uploads.controller.ts
import {
  Body,
  Controller,
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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { UploadsService } from './uploads.service';
import { InitUploadDto } from './dto/init-upload.dto';

@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard) // Retrait de PermissionsGuard ici pour simplifier l'accès
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('single')
  @Roles(UserRole.MEMBER, UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN)
  // 👇 SUPPRESSION DU @Permissions() ICI pour que les MEMBER puissent uploader
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  uploadSingle(
    @CurrentUser() actor: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: InitUploadDto,
  ) {
    return this.uploadsService.uploadAndCreateFileAsset({
      actor,
      file,
      category: dto.category as any, // "any" pour ignorer le typage strict si l'enum Frontend/Backend diffère
      folder: dto.folder,
      description: dto.description,
      isPublic: false,
    });
  }
}