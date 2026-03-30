// backend/src/modules/dashboard/dashboard-super-admin.controller.ts
import { Controller, Get, Query, UseGuards, UnauthorizedException } from '@nestjs/common';
import { DashboardSuperAdminService } from './dashboard-super-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN) // 🔒 Sécurisation stricte au rôle Super Admin
export class SuperAdminController {
  constructor(private readonly service: DashboardSuperAdminService) {}

  @Get('super-admin')
  getDashboard(@CurrentUser() user: AuthUser) {
    if (!user.associationId) throw new UnauthorizedException("Association requise pour voir ce tableau de bord.");
    // 💉 On passe l'ID de l'association au service
    return this.service.getSuperAdminDashboard(user.associationId);
  }

  @Get('super-admin/antennas')
  listAntennas(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string, 
    @Query('pageSize') pageSize?: string, 
    @Query('q') q?: string
  ) {
    if (!user.associationId) throw new UnauthorizedException("Association requise.");
    // 💉 On passe l'ID de l'association au service
    return this.service.listAntennas(user.associationId, Number(page) || 1, Number(pageSize) || 20, q);
  }
}