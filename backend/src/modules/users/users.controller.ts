//////// backend/src/modules/users/users.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
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
        fileSize: 5 * 1024 * 1024,
      },
      fileFilter: (_req, file, callback) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

        if (!allowedMimeTypes.includes(file.mimetype)) {
          callback(
            new BadRequestException('Formats autorisés : JPG, PNG, WEBP'),
            false,
          );
          return;
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
      throw new UnauthorizedException('Utilisateur non authentifié');
    }

    if (!file) {
      throw new BadRequestException('Aucun fichier reçu');
    }

    return this.usersService.uploadProfilePhoto(req.user.id, file, {
      ipAddress: this.extractIp(req),
      userAgent: req.headers['user-agent'],
    });
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