// backend/src/modules/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { DashboardMemberController } from './dashboard-member.controller';
import { DashboardMemberService } from './dashboard-member.service';
// Correction : Le fichier exporte SuperAdminController
import { SuperAdminController } from './dashboard-super-admin.controller'; 
import { DashboardSuperAdminService } from './dashboard-super-admin.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [
    DashboardMemberController,
    SuperAdminController, // Nom corrigé
  ],
  providers: [
    DashboardMemberService,
    DashboardSuperAdminService,
    PrismaService,
  ],
})
export class DashboardModule {}