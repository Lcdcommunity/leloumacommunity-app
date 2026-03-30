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
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.getMe(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthUser, 
    @Body() dto: UpdateMeDto,
    @Req() req: Request
  ) {
    return this.usersService.updateMe(user.id, user.associationId, dto, {
      ipAddress: this.extractIp(req),
      userAgent: req.headers['user-agent'],
    });
  }

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
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
    @Req() req?: Request,
  ) {
    if (!file) {
      throw new BadRequestException("Aucun fichier reçu. Le champ doit s'appeler 'avatar'.");
    }
    return this.usersService.uploadProfilePhoto(user.id, user.associationId, file, {
      ipAddress: req ? this.extractIp(req) : undefined,
      userAgent: req?.headers['user-agent'],
    });
  }

  private extractIp(req: Request): string | undefined {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) return forwardedFor.split(',')[0]?.trim();
    if (Array.isArray(forwardedFor) && forwardedFor.length > 0) return forwardedFor[0];
    return req.ip;
  }
}