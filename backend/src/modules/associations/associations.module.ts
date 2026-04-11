/////// backend/src/modules/associations/associations.module.ts
import { Module } from '@nestjs/common';
import { AssociationsController } from './associations.controller';
import { AssociationsService } from './associations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PublicThemeController } from './public-theme.controller'; 

@Module({
  imports: [NotificationsModule], 
  controllers: [
    AssociationsController,
    PublicThemeController 
  ],
  providers: [AssociationsService, PrismaService],
})
export class AssociationsModule {}