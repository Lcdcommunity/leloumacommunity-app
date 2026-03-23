// backend/src/modules/contributions/contributions.module.ts
import { Module } from '@nestjs/common';
import { ContributionsController } from './contributions.controller';
import { ContributionsService } from './contributions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsModule } from '../notifications/notifications.module'; // <-- Ajout de l'import

@Module({
  imports: [NotificationsModule], // <-- Injection du module ici
  controllers: [ContributionsController],
  providers: [ContributionsService, PrismaService, AuditService],
  exports: [ContributionsService],
})
export class ContributionsModule {}