// backend/src/modules/contributions/contributions.module.ts
import { Module } from '@nestjs/common';
import { ContributionsController } from './contributions.controller';
import { ContributionsService } from './contributions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ContributionsController],
  providers: [ContributionsService, PrismaService, AuditService],
  exports: [ContributionsService],
})
export class ContributionsModule {}