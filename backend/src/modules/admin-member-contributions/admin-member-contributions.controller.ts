// backend/src/modules/admin-member-contributions/admin-member-contributions.controller.ts
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { AdminMemberContributionsService } from './admin-member-contributions.service';
import { CreateContributionForMemberDto } from './dto/create-contribution-for-member.dto';

// Routes distinctes de admin.controller.ts (qui ne définit ni GET
// /admin/contributions/target-members ni POST /admin/contributions/for-member) —
// aucune collision possible, ces deux fichiers cohabitent sans se toucher.
@Controller('admin/contributions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN)
export class AdminMemberContributionsController {
  constructor(private readonly service: AdminMemberContributionsService) {}

  @Get('target-members')
  searchTargetMembers(@CurrentUser() user: AuthUser, @Query('q') q: string) {
    return this.service.searchTargetMembers(user.id, q);
  }

  @Post('for-member')
  createForMember(@CurrentUser() user: AuthUser, @Body() dto: CreateContributionForMemberDto) {
    return this.service.createContributionForMember(user.id, dto);
  }
}