// backend/src/modules/member/member.module.ts
import { Module } from '@nestjs/common';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module'; // <-- Ajout de l'import

@Module({
  imports: [NotificationsModule], // <-- Injection du module ici
  controllers: [MemberController],
  providers: [MemberService, PrismaService],
  exports: [MemberService],
})
export class MemberModule {}