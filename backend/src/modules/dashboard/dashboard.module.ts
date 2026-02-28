//backend/src/modules/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { DashboardMemberController } from './dashboard-member.controller';
import { DashboardMemberService } from './dashboard-member.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [DashboardMemberController],
  providers: [DashboardMemberService, PrismaService],
})
export class DashboardModule {}