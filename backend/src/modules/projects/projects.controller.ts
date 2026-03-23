//backend/src/modules/projects/projects.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, ProjectStatus } from '@prisma/client';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly service: ProjectsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ANTENNA_ADMIN, UserRole.MEMBER)
  list(@CurrentUser() user: AuthUser, @Query() query: any) {
    return this.service.listProjects({
      associationId: user.associationId,
      antennaId: user.role === UserRole.ANTENNA_ADMIN ? user.antennaId : query.antennaId,
      q: query.q,
      status: query.status as ProjectStatus,
      page: Number(query.page) || 1,
      pageSize: Number(query.pageSize) || 20,
    });
  }

  @Post('proposal')
  @Roles(UserRole.MEMBER)
  submitProposal(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.service.submitProposal(user.id, user.associationId, user.antennaId, body);
  }

  @Patch('proposal/:id/approve')
  @Roles(UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN)
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body('comment') comment: string) {
    return this.service.approveProposal(id, user.id, comment);
  }

  @Patch('proposal/:id/reject')
  @Roles(UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN)
  reject(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body('comment') comment: string) {
    return this.service.rejectProposal(id, user.id, comment);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ANTENNA_ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.service.createProject(user.id, user.associationId, body.antennaId || user.antennaId, body);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  delete(@Param('id') id: string) {
    return this.service.deleteProject(id);
  }
}