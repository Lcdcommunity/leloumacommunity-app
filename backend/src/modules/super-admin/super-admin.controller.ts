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
  listMembers(@Query() query: PaginationQueryDto) {
    return this.service.listUsersByRole(
      UserRole.MEMBER, 
      query.page, 
      query.pageSize, 
      query.q, 
      query.status
    );
  }

  // 👇 LA PORTE POUR /api/super-admin/admins AJOUTÉE ICI 👇
  @Get('admins')
  listAdmins(@Query() query: PaginationQueryDto) {
    return this.service.listUsersByRole(
      UserRole.ANTENNA_ADMIN, 
      query.page, 
      query.pageSize, 
      query.q, 
      query.status
    );
  }

  // --- GESTION DES APPROBATIONS ---
  @Patch('users/:id/approve')
  approveMember(@Param('id') id: string, @CurrentUser() admin: AuthUser) {
    return this.service.approveUser(id, admin.id);
  }

  @Patch('users/:id/reject')
  rejectMember(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser() admin: AuthUser) {
    return this.service.rejectUser(id, admin.id, reason);
  }

  // --- LISTES GLOBALES ---
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

  @Get('contributions')
  listContributions(@Query() query: PaginationQueryDto) {
    return this.service.listAllContributions(query.page, query.pageSize, query.status);
  }
}