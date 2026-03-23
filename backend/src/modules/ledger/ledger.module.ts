// backend/src/modules/ledger/ledger.module.ts
import { Module } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { LedgerController } from './ledger.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [LedgerController],
  providers: [LedgerService],
  exports: [LedgerService], // On l'exporte pour que ContributionsService puisse s'en servir
})
export class LedgerModule {}