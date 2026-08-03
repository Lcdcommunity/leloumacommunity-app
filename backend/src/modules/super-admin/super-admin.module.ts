// backend/src/modules/super-admin/super-admin.module.ts
import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthMailerService } from '../auth/auth.mailer.service';
import { NotificationsModule } from '../notifications/notifications.module';

// ⚡ IMPORTS CHIRURGICAUX POUR LES ÉLECTIONS
import { SuperAdminElectionsController } from './super-admin-elections.controller';
import { SuperAdminElectionsService } from './super-admin-elections.service';

@Module({
  imports: [NotificationsModule],
  controllers: [
    SuperAdminController,
    SuperAdminElectionsController, // ⚡ Ajout du contrôleur des élections
  ],
  providers: [
    SuperAdminService,
    SuperAdminElectionsService,    // ⚡ Ajout du service des élections
    PrismaService,
    AuthMailerService, // 🔥 CORRECTION : remplace MailService, plus utilisé par SuperAdminService
  ],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}