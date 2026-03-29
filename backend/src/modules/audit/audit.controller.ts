// backend/src/modules/audit/audit.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, AuditAction } from '@prisma/client';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ANTENNA_ADMIN) 
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 100,
  ) {
    // Si c'est un ANTENNA_ADMIN, on ne lui montre que les logs de son antenne
    const logs = await this.service.list({
      associationId: user.associationId,
      antennaId: user.role === UserRole.ANTENNA_ADMIN ? user.antennaId : undefined
    });

    return {
      items: logs,
      total: logs.length
    };
  }
}