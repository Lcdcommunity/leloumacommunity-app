// backend/src/modules/member/member.module.ts
import { Module } from '@nestjs/common';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';
// 🔥 AJOUT : DashboardMemberService, pour rebrancher /member/dashboard dessus
// (cf. member.controller.ts) — sa forme de retour correspond exactement à ce
// qu'attend web/app/(protected)/member/page.tsx (clé "me", recentContributions,
// projectsInProgress, latestContents, upcomingEvents, lateMembersPreview),
// contrairement à MemberService.getDashboard() qui renvoyait "user" et un
// stats incomplet. LedgerModule est déjà importé ci-dessous, ce qui suffit à
// satisfaire la dépendance LedgerService de DashboardMemberService.
import { DashboardMemberService } from '../dashboard/dashboard-member.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [NotificationsModule, LedgerModule],
  controllers: [MemberController],
  providers: [MemberService, DashboardMemberService, PrismaService],
  exports: [MemberService],
})
export class MemberModule {}