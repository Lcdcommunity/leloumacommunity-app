// backend/src/modules/auth/auth.controller.ts
//
// v1.1 — 🔥 CORRIGÉ (sécurité) : (1) getClientIp() se fiait au premier élément
//   de X-Forwarded-For (falsifiable par le client) : l'IP enregistrée avec les
//   sessions pouvait être inventée ; on utilise req.ip (trust proxy, cf.
//   main.ts). (2) Aucune limitation spécifique sur les routes sensibles : seul le
//   quota global (120 req/min/IP) s'appliquait, soit des milliers d'essais de
//   mot de passe par heure. Ajout de @Throttle par route : login 15/min,
//   forgot-password 5/min, reset-password 10/min, refresh 60/min (par IP).
//
import { Body, Controller, Post, Get, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
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

  // Même logique que ThrottlerBehindProxyGuard.getTracker() : req.ip, calculé
  // par Express d'après `trust proxy` (TRUST_PROXY_HOPS dans main.ts). On ne lit
  // plus X-Forwarded-For à la main : cet en-tête est fourni par le client.
  private getClientIp(req: Request): string {
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
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, {
      userAgent: req.headers['user-agent'],
      ipAddress: this.getClientIp(req),
      tenantDomain: this.getTenantDomain(req),
    });
  }

  @Post('refresh')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
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
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }
}