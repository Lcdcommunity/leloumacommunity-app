// backend/src/modules/notifications/notifications.module.ts
import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushSubscriptionController } from './push-subscription.controller';
import { PushService } from './push.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [
    NotificationsController,
    PushSubscriptionController,
  ],
  providers: [
    NotificationsService,
    PushService,
    PrismaService,
  ],
  exports: [
    NotificationsService,
    PushService,
  ],
})
export class NotificationsModule {}