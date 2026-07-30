// backend/src/domain-provisioning/domain-provisioning.controller.ts
// v2.2 — + route debug-curl temporaire (protégée CRON_SECRET), à retirer après diagnostic
import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { exec } from 'child_process';
import { DomainProvisioningService } from './domain-provisioning.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('domain-provisioning')
export class DomainProvisioningController {
  constructor(private readonly service: DomainProvisioningService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  @Post('provision')
  provision(@Body() body: { associationId: string; domain: string }) {
    return this.service.provisionAssociationDomain(body.associationId, body.domain);
  }

  @Get('check')
  check(@Headers('authorization') auth: string) {
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      throw new UnauthorizedException();
    }
    return this.service.checkPendingDomains();
  }

  // 🔍 DEBUG TEMPORAIRE — à retirer une fois le diagnostic Cloudflare terminé.
  // Fait tourner un vrai curl depuis le réseau Render lui-même, pour vérifier
  // si le blocage vient du réseau/IP sortant plutôt que de fetch/axios.
  @Get('debug-curl')
  debugCurl(@Headers('authorization') auth: string) {
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      throw new UnauthorizedException();
    }
    return new Promise((resolve) => {
      const cmd = `curl -s "https://api.cloudflare.com/client/v4/zones?name=ajvk.site" -H "Authorization: Bearer ${process.env.CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json"`;
      exec(cmd, { timeout: 15000 }, (error, stdout, stderr) => {
        resolve({
          hadError: !!error,
          errorMessage: error?.message ?? null,
          stdout,
          stderr,
        });
      });
    });
  }
}