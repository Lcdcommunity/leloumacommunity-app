// backend/src/domain-provisioning/domain-provisioning.controller.ts
// v2.1
import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { DomainProvisioningService } from './domain-provisioning.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('domain-provisioning')
export class DomainProvisioningController {
  constructor(private readonly service: DomainProvisioningService) {}

  // Contrairement à SystemAdminController, le @UseGuards n'est PAS au niveau du
  // controller ici : la route 'check' ci-dessous n'utilise pas de JWT du tout
  // (elle est protégée par CRON_SECRET), le guard doit donc rester local à 'provision'.
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
}