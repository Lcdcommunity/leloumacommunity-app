// backend/src/modules/super-admin/super-admin.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SuperAdminService } from './super-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ListAntennasQueryDto } from './dto/list-antennas-query.dto';
import { CreateAntennaDto } from './dto/create-antenna.dto';
import { CreateAntennaAdminDto } from './dto/create-antenna-admin.dto';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
// 🔥 AJOUT CHIRURGICAL : On autorise le SYSTEM_ADMIN à accéder à tout le panel Super Admin
@Roles(UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN)
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  /* ── GESTION DES PRIX (PRICING) ── */
  @Get('settings/pricing')
  getPricing(@CurrentUser() actor: AuthUser) {
    return this.service.getPricingConfig(actor.associationId);
  }

  @Put('settings/pricing')
  updatePricing(
    // 🔥 CORRECTION : On enlève le "?" pour matcher exactement avec la signature du Service
    @Body() pricingData: Record<string, { monthlyQuota: number; membershipCard: number; expenseValidationThreshold: number | null }>,
    @CurrentUser() actor: AuthUser
  ) {
    return this.service.updatePricingConfig(actor.associationId, pricingData, actor.id);
  }

  /* ────────────────────────────────────────────────── */

  @Get('members')
  listMembers(@CurrentUser() actor: AuthUser, @Query() query: PaginationQueryDto) {
    return this.service.listUsersByRole(
      actor.associationId, // 🔥 FILTRE INJECTÉ
      UserRole.MEMBER,
      query.page,
      query.pageSize,
      query.q,
      query.status,
    );
  }

  @Get('admins')
  listAdmins(@CurrentUser() actor: AuthUser, @Query() query: PaginationQueryDto) {
    return this.service.listUsersByRole(
      actor.associationId, // 🔥 FILTRE INJECTÉ
      UserRole.ANTENNA_ADMIN,
      query.page,
      query.pageSize,
      query.q,
      query.status,
    );
  }

  @Post('admins')
  createAdmin(@Body() body: CreateAntennaAdminDto, @CurrentUser() actor: AuthUser) {
    return this.service.createAntennaAdmin(body, actor.id, actor.associationId);
  }

  @Patch('admins/:id')
  updateAdmin(@Param('id') id: string, @Body() body: any, @CurrentUser() actor: AuthUser) {
    return this.service.updateAntennaAdmin(id, body, actor.id, actor.associationId);
  }

  @Patch('admins/:id/suspend')
  suspendAdmin(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.suspendAntennaAdmin(id, actor.id, actor.associationId);
  }

  @Patch('admins/:id/activate')
  activateAdmin(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.activateAntennaAdmin(id, actor.id, actor.associationId);
  }

  @Delete('admins/:id')
  deleteAdmin(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.deleteAntennaAdmin(id, actor.id, actor.associationId);
  }

  /* ── GESTION DES UTILISATEURS (MEMBRES) ── */
  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() body: any, @CurrentUser() actor: AuthUser) {
    return this.service.updateUser(id, body, actor.associationId);
  }

  @Patch('users/:id/approve')
  approveMember(@Param('id') id: string, @CurrentUser() admin: AuthUser) {
    return this.service.approveUser(id, admin.id, admin.associationId);
  }

  @Patch('users/:id/reject')
  rejectMember(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser() admin: AuthUser) {
    return this.service.rejectUser(id, admin.id, reason, admin.associationId);
  }

  @Patch('users/:id/suspend')
  suspendUser(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.suspendUser(id, actor.id, actor.associationId);
  }

  @Patch('users/:id/activate')
  activateUser(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.activateUser(id, actor.id, actor.associationId);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.deleteUser(id, actor.id, actor.associationId);
  }

  /* ── ANTENNES ── */
  @Get('antennas')
  listAntennas(@CurrentUser() actor: AuthUser, @Query() query: ListAntennasQueryDto) {
    return this.service.listAntennas(
      actor.associationId, // 🔥 FILTRE INJECTÉ
      query.page,
      query.pageSize,
      query.q,
      query.isActive,
    );
  }

  @Get('antennas/:id')
  getAntenna(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.getAntennaById(id, actor.associationId);
  }

  @Post('antennas')
  createAntenna(@Body() body: CreateAntennaDto, @CurrentUser() actor: AuthUser) {
    return this.service.createAntenna(body, actor.id, actor.associationId);
  }

  @Patch('antennas/:id')
  updateAntenna(@Param('id') id: string, @Body() body: Partial<CreateAntennaDto>, @CurrentUser() actor: AuthUser) {
    return this.service.updateAntenna(id, body, actor.associationId);
  }

  @Delete('antennas/:id')
  deleteAntenna(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.deleteAntenna(id, actor.associationId);
  }

  /* ── PROJETS ── */
  @Get('projects')
  listProjects(@CurrentUser() actor: AuthUser, @Query() query: PaginationQueryDto) {
    return this.service.listProjects(actor.associationId, query.page, query.pageSize, query.q);
  }

  @Patch('projects/:id')
  updateProject(@Param('id') id: string, @Body() body: any, @CurrentUser() actor: AuthUser) {
    return this.service.updateProject(id, body, actor.associationId);
  }

  @Delete('projects/:id')
  deleteProject(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.deleteProject(id, actor.associationId);
  }

  /* ── DOCUMENTS ── */
  @Post('documents')
  createDocument(@Body() body: { title: string; description?: string; fileAssetId: string }, @CurrentUser() actor: AuthUser) {
    return this.service.createDocument(body, actor.id, actor.associationId);
  }

  @Get('documents')
  listDocuments(@CurrentUser() actor: AuthUser, @Query() query: PaginationQueryDto) {
    return this.service.listDocuments(actor.associationId, query.page, query.pageSize, query.q);
  }

  @Delete('documents/:id')
  deleteDocument(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.deleteDocument(id, actor.associationId);
  }

  /* ── CONTRIBUTIONS ── */
  @Get('contributions')
  listContributions(
    @CurrentUser() actor: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    // 🔥 On force la conversion en Nombre pour éviter que Prisma ne crashe en PROD
    return this.service.listAllContributions(
      actor.associationId,
      Number(page) || 1,
      Number(pageSize) || 100,
      status
    );
  }

  /* ── GESTION DES CONTENUS (ANNONCES) (AJOUT CHIRURGICAL) ── */
  @Get('contents')
  listContents(@CurrentUser() actor: AuthUser, @Query() query: PaginationQueryDto) {
    return this.service.listContents(
      actor.associationId,
      query.page,
      query.pageSize,
      query.q,
      query.status,
    );
  }

  @Post('contents')
  createContent(@CurrentUser() actor: AuthUser, @Body() body: any) {
    return this.service.createContent(actor.id, actor.associationId, body);
  }

  @Patch('contents/:id')
  updateContent(@Param('id') id: string, @CurrentUser() actor: AuthUser, @Body() body: any) {
    return this.service.updateContent(id, actor.associationId, body);
  }

  @Delete('contents/:id')
  deleteContent(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.deleteContent(id, actor.associationId);
  }
}