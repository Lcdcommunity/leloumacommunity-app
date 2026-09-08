// backend/src/modules/member-activity/member-activity.module.ts
import { Module } from '@nestjs/common';
import { MemberActivityController } from './member-activity.controller';
import { MemberActivityService } from './member-activity.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [MemberActivityController],
  providers: [MemberActivityService, PrismaService],
})
export class MemberActivityModule {}