// backend/src/modules/member-activity/member-activity.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { MemberActivityService } from './member-activity.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('member/activity')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MEMBER)
export class MemberActivityController {
  constructor(private readonly service: MemberActivityService) {}

  @Get('pending')
  getPendingActions(@CurrentUser() user: AuthUser) {
    return this.service.getPendingActions(user.id);
  }
}