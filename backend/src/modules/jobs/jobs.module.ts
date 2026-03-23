// backend/src/modules/jobs/jobs.module.ts
import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module'; // <-- Ajouté
import { LedgerModule } from '../ledger/ledger.module'; // <-- Ajouté pour les soldes

@Module({
  imports: [NotificationsModule, LedgerModule], // <-- Double injection cruciale ici
  controllers: [JobsController],
  providers: [JobsService, PrismaService],
  exports: [JobsService],
})
export class JobsModule {}