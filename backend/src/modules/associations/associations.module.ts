// backend/src/modules/associations/associations.module.ts
import { Module } from '@nestjs/common';
import { AssociationsController } from './associations.controller';
import { AssociationsService } from './associations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module'; // <-- Ajouté

@Module({
  imports: [NotificationsModule], // <-- Injection pour les alertes de modifs globales
  controllers: [AssociationsController],
  providers: [AssociationsService, PrismaService],
})
export class AssociationsModule {}