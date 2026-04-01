// backend/src/modules/projects/projects.controller.ts
// backend/src/modules/projects/projects.controller.ts
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
  // 🔥 AJOUT CHIRURGICAL : Le rôle SYSTEM_ADMIN est maintenant autorisé à lister les projets
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SUPER_ADMIN, UserRole.ANTENNA_ADMIN, UserRole.MEMBER)
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
  // 🔥 AJOUT CHIRURGICAL : SYSTEM_ADMIN autorisé à approuver
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SUPER_ADMIN, UserRole.ANTENNA_ADMIN)
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body('comment') comment: string) {
    return this.service.approveProposal(id, user.associationId, user.id, comment);
  }

  @Patch('proposal/:id/reject')
  // 🔥 AJOUT CHIRURGICAL : SYSTEM_ADMIN autorisé à rejeter
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SUPER_ADMIN, UserRole.ANTENNA_ADMIN)
  reject(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body('comment') comment: string) {
    return this.service.rejectProposal(id, user.associationId, user.id, comment);
  }

  @Post()
  // 🔥 AJOUT CHIRURGICAL : SYSTEM_ADMIN autorisé à créer directement un projet
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SUPER_ADMIN, UserRole.ANTENNA_ADMIN)
  create(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.service.createProject(user.id, user.associationId, body.antennaId || user.antennaId, body);
  }

  @Delete(':id')
  // 🔥 AJOUT CHIRURGICAL : SYSTEM_ADMIN autorisé à supprimer un projet
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SUPER_ADMIN)
  delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.deleteProject(id, user.associationId);
  }
}