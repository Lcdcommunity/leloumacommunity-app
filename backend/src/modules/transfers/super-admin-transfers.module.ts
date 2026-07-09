// backend/src/modules/transfers/super-admin-transfers.module.ts
import { Module } from '@nestjs/common';
import { SuperAdminTransfersController } from './super-admin-transfers.controller';
import { SuperAdminTransfersService } from './super-admin-transfers.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SuperAdminTransfersController],
  providers: [SuperAdminTransfersService],
})
export class SuperAdminTransfersModule {}