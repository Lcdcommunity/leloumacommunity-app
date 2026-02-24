//src/modules/uploads/uploads.controller.ts
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
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { UploadsService } from './uploads.service';
import { InitUploadDto } from './dto/init-upload.dto';

@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('single')
  @Roles(UserRole.MEMBER, UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN)
  @Permissions(PERMISSIONS.FILES_UPLOAD)
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
      category: dto.category,
      folder: dto.folder,
      description: dto.description,
      isPublic: false,
    });
  }
}