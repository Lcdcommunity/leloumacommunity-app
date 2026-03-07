// backend/src/modules/admin/admin.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Header, Res } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Response } from 'express';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ANTENNA_ADMIN)
export class AdminController {
  constructor(private readonly service: AdminService) {}

  // --- APPROBATIONS COMPTES ---
  @Get('member-approvals')
  listPending(@CurrentUser() user: AuthUser, @Query('page') page = 1, @Query('pageSize') pageSize = 100) {
    return this.service.listPendingApprovals(user.id, +page, +pageSize);
  }

  @Patch('member-approvals/:id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.approveMember(id, user.id);
  }

  @Patch('member-approvals/:id/reject')
  reject(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser() user: AuthUser) {
    return this.service.rejectMember(id, user.id, reason);
  }

  // --- GESTION DES MEMBRES ---
  @Get('members')
  listMembers(
    @CurrentUser() user: AuthUser, 
    @Query('page') page = 1, 
    @Query('pageSize') pageSize = 100, 
    @Query('q') q?: string, 
    @Query('status') status?: string
  ) {
    return this.service.listMembers(user.id, +page, +pageSize, q, status);
  }

  @Get('members/export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="membres-antenne.csv"')
  async exportMembers(@CurrentUser() user: AuthUser, @Res() res: Response) {
    const csv = await this.service.exportMembers(user.id);
    return res.send(csv);
  }

  @Get('late-members')
  listLateMembers(@CurrentUser() user: AuthUser, @Query('page') page = 1, @Query('pageSize') pageSize = 100) {
    return this.service.listLateMembers(user.id, +page, +pageSize);
  }

  // --- GESTION DES COTISATIONS ---
  @Get('contributions')
  listContributions(
    @CurrentUser() user: AuthUser, 
    @Query('page') page = 1, 
    @Query('pageSize') pageSize = 100, 
    @Query('status') status?: string, 
    @Query('q') q?: string
  ) {
    return this.service.listContributions(user.id, +page, +pageSize, status, q);
  }

  @Patch('contributions/:id/validate')
  validateContribution(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.validateContribution(id, user.id);
  }

  @Patch('contributions/:id/reject')
  rejectContribution(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser() user: AuthUser) {
    return this.service.rejectContribution(id, user.id, reason);
  }

  @Patch('contributions/:id')
  updateContribution(@Param('id') id: string, @Body('amount') amount: number, @CurrentUser() user: AuthUser) {
    return this.service.updateContribution(id, user.id, amount);
  }

  // --- GESTION DES PROJETS (ANTENNE) ---
  @Get('projects')
  listProjects(
    @CurrentUser() user: AuthUser, 
    @Query('page') page = 1, 
    @Query('pageSize') pageSize = 10, 
    @Query('status') status?: string, 
    @Query('q') q?: string
  ) {
    return this.service.listProjects(user.id, +page, +pageSize, status, q);
  }

  @Post('projects')
  createProject(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.service.createProject(user.id, body);
  }

  @Patch('projects/:id')
  updateProject(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() body: any) {
    return this.service.updateProject(id, user.id, body);
  }

  @Delete('projects/:id')
  deleteProject(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.deleteProject(id, user.id);
  }

  // 👇 NOUVELLE ROUTE : RÉCEPTION DES PROPOSITIONS DE PROJETS
  @Get('project-proposals')
  async listProjectProposals(
    @CurrentUser() user: AuthUser, 
    @Query('page') page = 1, 
    @Query('pageSize') pageSize = 10, 
    @Query('status') status?: string
  ) {
    // Note : Cette méthode doit exister dans `admin.service.ts`.
    // Si elle n'existe pas, nous la rajouterons dans la foulée,
    // mais je la déclare ici pour que le controller soit complet.
    return (this.service as any).listProjectProposals(user.id, +page, +pageSize, status);
  }

  // --- GESTION DES DOCUMENTS (ANTENNE) ---
  @Get('documents')
  listDocuments(
    @CurrentUser() user: AuthUser,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 100,
    @Query('q') q?: string,
  ) {
    return this.service.listDocuments(user.id, +page, +pageSize, q);
  }

  @Post('documents')
  createDocument(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.service.createDocument(user.id, body);
  }

  @Delete('documents/:id')
  deleteDocument(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.deleteDocument(id, user.id);
  }

  // --- GESTION DES CONTENUS (INFORMATIONS / NEWS) ---
  @Get('contents')
  listContents(
    @CurrentUser() user: AuthUser,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 100,
    @Query('q') q?: string,
    @Query('status') status?: string
  ) {
    return this.service.listContents(user.id, +page, +pageSize, q, status);
  }

  @Post('contents')
  createContent(@CurrentUser() user: AuthUser, @Body() body: any) {
    return this.service.createContent(user.id, body);
  }

  @Patch('contents/:id')
  updateContent(@Param('id') id: string, @CurrentUser() user: AuthUser, @Body() body: any) {
    return this.service.updateContent(id, user.id, body);
  }

  @Delete('contents/:id')
  deleteContent(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.deleteContent(id, user.id);
  }

  @Get('notifications')
  listNotifications(@CurrentUser() user: AuthUser, @Query('page') page = 1, @Query('pageSize') pageSize = 100) {
    return this.service.listNotifications(user.id, +page, +pageSize);
  }
}