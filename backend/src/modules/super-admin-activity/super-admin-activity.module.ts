// backend/src/modules/super-admin-activity/super-admin-activity.module.ts
import { Module } from '@nestjs/common';
import { SuperAdminActivityController } from './super-admin-activity.controller';
import { SuperAdminActivityService } from './super-admin-activity.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [SuperAdminActivityController],
  providers: [SuperAdminActivityService, PrismaService],
})
export class SuperAdminActivityModule {}