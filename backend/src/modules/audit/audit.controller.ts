// backend/src/modules/audit/audit.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ANTENNA_ADMIN) 
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('page') page: string = '1',
    @Query('pageSize') pageSize: string = '50',
    @Query('antennaId') antennaId?: string,
  ) {
    // 🔥 SÉCURITÉ : Si c'est un ANTENNA_ADMIN, on ignore l'antennaId du Query et on force la sienne
    const resolvedAntennaId = 
      user.role === UserRole.ANTENNA_ADMIN 
        ? user.antennaId 
        : antennaId;

    return this.service.list({
      associationId: user.associationId,
      antennaId: resolvedAntennaId,
      page: Math.max(1, parseInt(page, 10)),
      pageSize: Math.min(100, parseInt(pageSize, 10))
    });
  }
}