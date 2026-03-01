//backend/src/modules/super-admin/super-admin.controller.ts
import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  @Get('members')
  listMembers(@Query() query: PaginationQueryDto, @Query('status') status?: string) {
    return this.service.listUsersByRole(UserRole.MEMBER, query.page, query.pageSize, query.q, status);
  }

  @Patch('users/:id/approve')
  approveMember(@Param('id') id: string, @CurrentUser() admin: AuthUser) {
    return this.service.approveUser(id, admin.id);
  }

  @Patch('users/:id/reject')
  rejectMember(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser() admin: AuthUser) {
    return this.service.rejectUser(id, admin.id, reason);
  }

  @Get('antennas')
  listAntennas(@Query() query: PaginationQueryDto) {
    return this.service.listAntennas(query.page, query.pageSize, query.q);
  }

  @Get('projects')
  listProjects(@Query() query: PaginationQueryDto) {
    return this.service.listProjects(query.page, query.pageSize, query.q);
  }

  @Get('documents')
  listDocuments(@Query() query: PaginationQueryDto) {
    return this.service.listDocuments(query.page, query.pageSize, query.q);
  }
}