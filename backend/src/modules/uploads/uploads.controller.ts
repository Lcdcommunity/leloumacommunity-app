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
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('single')
  // Ajout chirurgical de UserRole.SYSTEM_ADMIN ici
  @Roles(UserRole.MEMBER, UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  async uploadSingle(
    @CurrentUser() actor: AuthUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: InitUploadDto,
  ) {
    // Correction chirurgicale : Mapping de la catégorie pour éviter le crash de l'enum Prisma
    let safeCategory = dto.category as any;
    if (safeCategory === 'DOCUMENT') {
      safeCategory = 'ANTENNA_DOCUMENT';
    }

    const fileAsset = await this.uploadsService.uploadAndCreateFileAsset({
      actor,
      file,
      category: safeCategory,
      folder: dto.folder,
      description: dto.description,
      isPublic: false,
    });

    // Correction chirurgicale : Renvoyer "fileName" pour correspondre exactement à ce qu'attend le Front
    return {
      id: fileAsset.id,
      url: fileAsset.url,
      fileName: fileAsset.originalFilename, 
    };
  }
}