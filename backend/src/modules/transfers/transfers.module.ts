// backend/src/modules/transfers/transfers.module.ts
import { Module } from '@nestjs/common';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [TransfersController],
  providers: [TransfersService],
  exports: [TransfersService],
})
export class TransfersModule {}