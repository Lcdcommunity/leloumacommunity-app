//backend/src/modules/dashboard/dashboard-antenna-admin.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardAntennaAdminService } from './dashboard-antenna-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('dashboard/antenna-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ANTENNA_ADMIN)
export class DashboardAntennaAdminController {
  constructor(private readonly service: DashboardAntennaAdminService) {}

  @Get()
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.service.getDashboard(user.id);
  }
}