// backend/src/modules/super-admin/super-admin.module.ts
import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../../common/services/mail.service';
import { NotificationsModule } from '../notifications/notifications.module'; // <-- Ajout de l'import

@Module({
  imports: [NotificationsModule], // <-- Injection du module ici
  controllers: [SuperAdminController],
  providers: [SuperAdminService, PrismaService, MailService],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}