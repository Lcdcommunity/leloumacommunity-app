// backend/src/modules/system-admin/system-admin.module.ts
import { Module } from '@nestjs/common';
import { SystemAdminController } from './system-admin.controller';
import { SystemAdminService } from './system-admin.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthMailerService } from '../auth/auth.mailer.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { VercelProvider } from '../../domain-provisioning/providers/vercel.provider';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
  ],
  controllers: [SystemAdminController],
  providers: [
    SystemAdminService,
    VercelProvider,
    AuthMailerService,
  ],
  exports: [SystemAdminService],
})
export class SystemAdminModule {}