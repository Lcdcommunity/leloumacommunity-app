// backend/src/modules/users/users.controller.ts
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
    if (!req.user?.id) throw new UnauthorizedException('Utilisateur non authentifié');
    return this.usersService.getMe(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(@Req() req: AuthenticatedRequest, @Body() dto: UpdateMeDto) {
    if (!req.user?.id) throw new UnauthorizedException('Utilisateur non authentifié');
    return this.usersService.updateMe(req.user.id, dto, {
      ipAddress: this.extractIp(req),
      userAgent: req.headers['user-agent'],
    });
  }

  /**
   * POST /users/me/avatar
   * Nouvel endpoint utilisé par la page profil (champ FormData : "avatar").
   * Délègue exactement à uploadProfilePhoto() du service existant.
   */
  @UseGuards(JwtAuthGuard)
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowed.includes(file.mimetype)) {
          return cb(new BadRequestException('Formats autorisés : JPG, PNG, WEBP, GIF'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!req.user?.id) throw new UnauthorizedException('Utilisateur non authentifié');
    if (!file) {
      this.logger.error("Pas de fichier sur /users/me/avatar — le champ FormData doit s'appeler 'avatar'");
      throw new BadRequestException("Aucun fichier reçu. Le champ doit s'appeler 'avatar'.");
    }
    this.logger.log(`[avatar] User ${req.user.id} — ${file.originalname} (${file.size} bytes)`);
    try {
      return await this.usersService.uploadProfilePhoto(req.user.id, file, {
        ipAddress: this.extractIp(req),
        userAgent: req.headers['user-agent'],
      });
    } catch (error) {
      this.logger.error(`[avatar] ${(error as Error).message}`);
      throw new BadRequestException((error as Error).message || "Erreur lors du traitement de l'image.");
    }
  }

  /**
   * POST /users/me/profile-photo
   * Ancien endpoint conservé pour rétrocompatibilité (champ FormData : "file").
   */
  @UseGuards(JwtAuthGuard)
  @Post('me/profile-photo')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (!allowed.includes(file.mimetype)) {
          return callback(new BadRequestException('Formats autorisés : JPG, PNG, WEBP'), false);
        }
        callback(null, true);
      },
    }),
  )
  async uploadProfilePhoto(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!req.user?.id) {
      this.logger.error("Tentative d'upload sans ID utilisateur dans le token");
      throw new UnauthorizedException('Utilisateur non authentifié');
    }
    if (!file) {
      this.logger.error("Pas de fichier sur /users/me/profile-photo — le champ FormData doit s'appeler 'file'");
      throw new BadRequestException('Aucun fichier reçu par le serveur.');
    }
    this.logger.log(`[profile-photo] User ${req.user.id} — ${file.originalname} (${file.size} bytes)`);
    try {
      return await this.usersService.uploadProfilePhoto(req.user.id, file, {
        ipAddress: this.extractIp(req),
        userAgent: req.headers['user-agent'],
      });
    } catch (error) {
      this.logger.error(`[profile-photo] ${(error as Error).message}`);
      throw new BadRequestException((error as Error).message || "Erreur lors du traitement de l'image.");
    }
  }

  private extractIp(req: Request): string | undefined {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) return forwardedFor.split(',')[0]?.trim();
    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) return forwardedFor[0];
    return req.ip;
  }
}