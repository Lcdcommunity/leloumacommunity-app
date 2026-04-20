/////// backend/src/modules/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module'; 

// ⚡ IMPORTS CHIRURGICAUX POUR LES ÉLECTIONS
import { AdminElectionsController } from './admin-elections.controller';
import { AdminElectionsService } from './admin-elections.service';

@Module({
  imports: [NotificationsModule],
  controllers: [
    AdminController,
    AdminElectionsController, // ⚡ Ajout du contrôleur des élections
  ],
  providers: [
    AdminService,
    AdminElectionsService,    // ⚡ Ajout du service des élections
    PrismaService,
  ],
  exports: [AdminService],
})
export class AdminModule {}