// backend/src/modules/platform-wallet/platform-wallet.module.ts
//
// v1.0 — Module isolé : wallet de la plateforme + virements de commission des antennes.
//
import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PlatformTransfersController } from './platform-transfers.controller';
import { PlatformTransfersService } from './platform-transfers.service';
import { PlatformWalletController } from './platform-wallet.controller';
import { PlatformWalletService } from './platform-wallet.service';

@Module({
  imports: [NotificationsModule], // PrismaModule est global
  controllers: [PlatformWalletController, PlatformTransfersController],
  providers: [PlatformWalletService, PlatformTransfersService],
  exports: [PlatformWalletService],
})
export class PlatformWalletModule {}
