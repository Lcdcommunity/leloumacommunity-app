// backend/src/modules/sponsors/sponsors.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SponsorsService } from './sponsors.service';
import { UserRole } from '@prisma/client';
import { CreateSponsorDto, UpdateSponsorDto } from './dto/sponsor.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('super-admin/sponsors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SponsorsController {
  constructor(private readonly sponsorsService: SponsorsService) {}

  // ⚡ CORRECTION : Ouverture de la lecture à tous les rôles pour la consultation
  @Get()
  @Roles(UserRole.MEMBER, UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN)
  listSponsors(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.sponsorsService.listSponsors(
      user.associationId, 
      page ? parseInt(page, 10) : 1, 
      pageSize ? parseInt(pageSize, 10) : 100
    );
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN)
  createSponsor(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSponsorDto
  ) {
    return this.sponsorsService.createSponsor(user.associationId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN)
  updateSponsor(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSponsorDto
  ) {
    return this.sponsorsService.updateSponsor(user.associationId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN)
  deleteSponsor(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string
  ) {
    return this.sponsorsService.deleteSponsor(user.associationId, id);
  }
}