// backend/src/domain-provisioning/domain-provisioning.controller.ts
// v2.1
//
// v2.2 — 🔥 CORRIGÉ (sécurité) : GET /domain-provisioning/check comparait
//   `auth !== `Bearer ${process.env.CRON_SECRET}``. CRON_SECRET non défini ⇒
//   « Bearer undefined » acceptable par n'importe qui. Désormais
//   isValidBearerSecret() : secret absent ⇒ refusé, comparaison en temps constant.
//
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
import { isValidBearerSecret } from '../common/utils/bearer-secret.util';

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
    if (!isValidBearerSecret(auth, process.env.CRON_SECRET)) {
      throw new UnauthorizedException();
    }
    return this.service.checkPendingDomains();
  }
}