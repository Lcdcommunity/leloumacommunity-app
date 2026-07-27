// backend/src/modules/associations/associations.module.ts
import { Module } from '@nestjs/common';
import { AssociationsController } from './associations.controller';
import { AssociationsService } from './associations.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PublicThemeController } from './public-theme.controller';
import { PublicDocumentsController } from './public-documents.controller';
import { PublicOriginLocalitiesController } from './public-origin-localities.controller';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [
    AssociationsController,
    PublicThemeController,
    PublicDocumentsController,
    PublicOriginLocalitiesController,
  ],
  providers: [AssociationsService],
})
export class AssociationsModule {}