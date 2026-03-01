//backend/src/modules/dashboard/dashboard-super-admin.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardSuperAdminService } from './dashboard-super-admin.service';
// ... autres imports

@Controller('dashboard') // Changez 'super-admin' par 'dashboard'
export class SuperAdminController {
  constructor(private readonly service: DashboardSuperAdminService) {}

  @Get('super-admin') // Changez 'dashboard' par 'super-admin'
  getDashboard() {
    // Cette méthode répondra maintenant sur : /api/dashboard/super-admin
    return this.service.getSuperAdminDashboard();
  }

  // Gardez vos autres routes si nécessaire en adaptant le chemin
  @Get('super-admin/antennas')
  listAntennas(@Query('page') page?: string, @Query('pageSize') pageSize?: string, @Query('q') q?: string) {
    return this.service.listAntennas(Number(page) || 1, Number(pageSize) || 20, q);
  }
}