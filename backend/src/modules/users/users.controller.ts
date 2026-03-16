//////// backend/src/modules/users/users.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email?: string;
    role?: string;
    associationId?: string;
  };
};

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }
    return this.usersService.getMe(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(@Req() req: AuthenticatedRequest, @Body() dto: UpdateMeDto) {
    if (!req.user?.id) {
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    return this.usersService.updateMe(req.user.id, dto, {
      ipAddress: this.extractIp(req),
      userAgent: req.headers['user-agent'],
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/profile-photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // Limite à 5 Mo
      },
      fileFilter: (_req, file, callback) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          return callback(
            new BadRequestException('Formats autorisés : JPG, PNG, WEBP'),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async uploadProfilePhoto(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // 1. Vérification de l'utilisateur
    if (!req.user?.id) {
      this.logger.error("Tentative d'upload sans ID utilisateur dans le token");
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    // 2. Vérification de la présence du fichier (Source courante de l'erreur 400)
    if (!file) {
      this.logger.error("Le contrôleur n'a reçu aucun fichier. Vérifiez que la clé du FormData est 'file'");
      throw new BadRequestException('Aucun fichier reçu par le serveur.');
    }

    this.logger.log(`Réception fichier pour l'utilisateur ${req.user.id}: ${file.originalname} (${file.size} bytes)`);

    try {
      // 3. Appel au service pour l'envoi vers Cloudinary
      return await this.usersService.uploadProfilePhoto(req.user.id, file, {
        ipAddress: this.extractIp(req),
        userAgent: req.headers['user-agent'],
      });
    } catch (error) {
      this.logger.error(`Erreur lors de l'upload de la photo: ${error.message}`);
      throw new BadRequestException(error.message || "Erreur lors du traitement de l'image");
    }
  }

  private extractIp(req: Request): string | undefined {
    const forwardedFor = req.headers['x-forwarded-for'];

    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0]?.trim();
    }

    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
      return forwardedFor[0];
    }

    return req.ip;
  }
}