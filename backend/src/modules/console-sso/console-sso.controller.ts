// backend/src/modules/console-sso/console-sso.controller.ts
//
// v1.0 — Console du Grand Chef : bascule vers le back-office Direct Transf'air (SYSTEM_ADMIN uniquement).
//
import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConsoleSsoService } from './console-sso.service';

@Controller('console')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN)
export class ConsoleSsoController {
  constructor(private readonly service: ConsoleSsoService) {}

  /** La connexion unique est-elle configurée ? (le hub grise la carte « sociétés de transfert » sinon) */
  @Get('transfer-sso/status')
  status() {
    return this.service.status();
  }

  /** Assertion signée de 60 s à remettre à /auth/platform-sso de Direct Transf'air. */
  @Post('transfer-sso')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@CurrentUser() user: AuthUser, @Req() req: { ip?: string; headers: Record<string, string | string[] | undefined> }) {
    const ua = req.headers['user-agent'];
    return this.service.createTransferAssertion(user.id, { ip: req.ip, userAgent: Array.isArray(ua) ? ua[0] : ua });
  }
}
