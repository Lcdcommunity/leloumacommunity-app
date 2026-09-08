// backend/src/modules/super-admin-activity/super-admin-activity.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SuperAdminActivityService } from './super-admin-activity.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('super-admin/activity')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class SuperAdminActivityController {
  constructor(private readonly service: SuperAdminActivityService) {}

  @Get('event-responses')
  listEventResponses(@CurrentUser() user: AuthUser, @Query('take') take?: string) {
    return this.service.listRecentEventResponses(user.id, take ? Number(take) : 10);
  }

  @Get('communications')
  listCommunications(@CurrentUser() user: AuthUser, @Query('take') take?: string) {
    return this.service.listRecentCommunications(user.id, take ? Number(take) : 10);
  }
}