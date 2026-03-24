//backend/src/modules/super-admin/super-admin.controller.ts
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
@Roles(UserRole.SUPER_ADMIN)
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  /* ── GESTION DES PRIX (PRICING) ── */
  @Get('settings/pricing')
  getPricing(@CurrentUser() actor: AuthUser) {
    return this.service.getPricingConfig(actor.associationId);
  }

  @Put('settings/pricing')
  updatePricing(
    @Body() pricingData: Record<string, { monthlyQuota: number; membershipCard: number }>,
    @CurrentUser() actor: AuthUser
  ) {
    return this.service.updatePricingConfig(actor.associationId, pricingData, actor.id);
  }

  /* ────────────────────────────────────────────────── */

  @Get('members')
  listMembers(@Query() query: PaginationQueryDto) {
    return this.service.listUsersByRole(
      UserRole.MEMBER,
      query.page,
      query.pageSize,
      query.q,
      query.status,
    );
  }

  @Get('admins')
  listAdmins(@Query() query: PaginationQueryDto) {
    return this.service.listUsersByRole(
      UserRole.ANTENNA_ADMIN,
      query.page,
      query.pageSize,
      query.q,
      query.status,
    );
  }

  @Post('admins')
  createAdmin(@Body() body: CreateAntennaAdminDto, @CurrentUser() actor: AuthUser) {
    return this.service.createAntennaAdmin(body, actor.id);
  }

  @Patch('admins/:id')
  updateAdmin(@Param('id') id: string, @Body() body: any, @CurrentUser() actor: AuthUser) {
    return this.service.updateAntennaAdmin(id, body, actor.id);
  }

  @Patch('admins/:id/suspend')
  suspendAdmin(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.suspendAntennaAdmin(id, actor.id);
  }

  @Patch('admins/:id/activate')
  activateAdmin(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.activateAntennaAdmin(id, actor.id);
  }

  @Delete('admins/:id')
  deleteAdmin(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.deleteAntennaAdmin(id, actor.id);
  }

  /* ── GESTION DES UTILISATEURS (MEMBRES) PAR LE SUPER ADMIN ── */
  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() body: any) {
    return this.service.updateUser(id, body);
  }

  @Patch('users/:id/approve')
  approveMember(@Param('id') id: string, @CurrentUser() admin: AuthUser) {
    return this.service.approveUser(id, admin.id);
  }

  @Patch('users/:id/reject')
  rejectMember(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser() admin: AuthUser) {
    return this.service.rejectUser(id, admin.id, reason);
  }

  @Patch('users/:id/suspend')
  suspendUser(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.suspendUser(id, actor.id);
  }

  @Patch('users/:id/activate')
  activateUser(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.activateUser(id, actor.id);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.deleteUser(id, actor.id);
  }

  /* ── ANTENNES ── */
  @Get('antennas')
  listAntennas(@Query() query: ListAntennasQueryDto) {
    return this.service.listAntennas(
      query.page,
      query.pageSize,
      query.q,
      query.isActive,
    );
  }

  @Get('antennas/:id')
  getAntenna(@Param('id') id: string) {
    return this.service.getAntennaById(id);
  }

  @Post('antennas')
  createAntenna(@Body() body: CreateAntennaDto, @CurrentUser() actor: AuthUser) {
    return this.service.createAntenna(body, actor.id);
  }

  @Patch('antennas/:id')
  updateAntenna(@Param('id') id: string, @Body() body: Partial<CreateAntennaDto>) {
    return this.service.updateAntenna(id, body);
  }

  @Delete('antennas/:id')
  deleteAntenna(@Param('id') id: string) {
    return this.service.deleteAntenna(id);
  }

  /* ── PROJETS ── */
  @Get('projects')
  listProjects(@Query() query: PaginationQueryDto) {
    return this.service.listProjects(query.page, query.pageSize, query.q);
  }

  // AJOUT DE LA ROUTE MANQUANTE ICI
  @Patch('projects/:id')
  updateProject(@Param('id') id: string, @Body() body: any) {
    return this.service.updateProject(id, body);
  }

  @Delete('projects/:id')
  deleteProject(@Param('id') id: string) {
    return this.service.deleteProject(id);
  }

  /* ── DOCUMENTS ── */
  @Post('documents')
  createDocument(@Body() body: { title: string; description?: string; fileAssetId: string }, @CurrentUser() actor: AuthUser) {
    return this.service.createDocument(body, actor.id, actor.associationId);
  }

  @Get('documents')
  listDocuments(@Query() query: PaginationQueryDto) {
    return this.service.listDocuments(query.page, query.pageSize, query.q);
  }

  @Delete('documents/:id')
  deleteDocument(@Param('id') id: string) {
    return this.service.deleteDocument(id);
  }

  /* ── CONTRIBUTIONS ── */
  @Get('contributions')
  listContributions(@Query() query: PaginationQueryDto) {
    return this.service.listAllContributions(query.page, query.pageSize, query.status);
  }
}