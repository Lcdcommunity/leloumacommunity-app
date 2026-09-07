// backend/src/modules/admin-member-contributions/admin-member-contributions.module.ts
import { Module } from '@nestjs/common';
import { AdminMemberContributionsController } from './admin-member-contributions.controller';
import { AdminMemberContributionsService } from './admin-member-contributions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [AdminMemberContributionsController],
  providers: [AdminMemberContributionsService, PrismaService],
})
export class AdminMemberContributionsModule {}