// backend/src/modules/super-admin/super-admin.module.ts
import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../common/services/mail.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [SuperAdminController],
  providers: [SuperAdminService, PrismaService, MailService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}