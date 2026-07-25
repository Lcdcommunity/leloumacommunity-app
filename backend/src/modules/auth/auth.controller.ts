// backend/src/modules/auth/auth.controller.ts
import { Body, Controller, Post, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LogoutDto } from './dto/logout.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Même logique que ThrottlerBehindProxyGuard.getTracker() : derrière un
  // proxy (Vercel/Railway), req.ip renvoie souvent l'IP du proxy, pas celle
  // du visiteur.
  private getClientIp(req: Request): string {
    const xff = req.headers['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length > 0) {
      return xff.split(',')[0].trim();
    }
    return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  }

  // Priorité à `Origin` (posé par le navigateur, non falsifiable en JS) sur
  // x-tenant-domain (posé par le client, contournable). On ne retombe JAMAIS
  // sur req.headers.host : c'est celui du backend, identique pour tous les tenants.
  private getTenantDomain(req: Request): string | undefined {
    const origin = req.headers.origin;
    if (origin) {
      try {
        return new URL(origin).hostname;
      } catch {
        // origin malformé, on retombe sur le header custom ci-dessous
      }
    }
    const custom = req.headers['x-tenant-domain'];
    return typeof custom === 'string' && custom.length > 0 ? custom : undefined;
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user.id);
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, {
      userAgent: req.headers['user-agent'],
      ipAddress: this.getClientIp(req),
      tenantDomain: this.getTenantDomain(req),
    });
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto, {
      userAgent: req.headers['user-agent'],
      ipAddress: this.getClientIp(req),
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@CurrentUser() user: AuthUser, @Body() dto: LogoutDto) {
    return this.authService.logout(user.id, dto);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}