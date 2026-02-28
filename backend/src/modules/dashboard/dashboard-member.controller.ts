//backend/src/modules/dashboard/dashboard-member.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardMemberService } from './dashboard-member.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardMemberController {
  constructor(private readonly service: DashboardMemberService) {}

  @Get('member')
  @Roles(RoleEnum.MEMBER)
  getMemberDashboard(@CurrentUser() user: AuthUser) {
    return this.service.getMemberDashboard(user.id);
  }
}