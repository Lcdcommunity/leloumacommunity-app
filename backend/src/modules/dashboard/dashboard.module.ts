// backend/src/modules/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { DashboardMemberController } from './dashboard-member.controller';
import { DashboardMemberService } from './dashboard-member.service';
import { SuperAdminController } from './dashboard-super-admin.controller'; 
import { DashboardSuperAdminService } from './dashboard-super-admin.service';

// Importation chirurgicale des nouveaux composants
import { DashboardAntennaAdminController } from './dashboard-antenna-admin.controller';
import { DashboardAntennaAdminService } from './dashboard-antenna-admin.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [
    DashboardMemberController,
    SuperAdminController,
    DashboardAntennaAdminController, //
  ],
  providers: [
    DashboardMemberService,
    DashboardSuperAdminService,
    DashboardAntennaAdminService,
    PrismaService,
  ],
})
export class DashboardModule {}