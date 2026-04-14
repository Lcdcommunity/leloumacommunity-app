// backend/src/modules/events/events.module.ts
import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module'; // 🔥 AJOUT CHIRURGICAL

@Module({
  imports: [PrismaModule, NotificationsModule], // 🔥 INJECTION ICI
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}