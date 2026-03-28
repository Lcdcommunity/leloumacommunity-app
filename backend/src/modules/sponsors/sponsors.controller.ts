// backend/src/modules/sponsors/sponsors.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SponsorsService } from './sponsors.service';
import { UserRole } from '@prisma/client';
import { CreateSponsorDto, UpdateSponsorDto } from './dto/sponsor.dto';

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('super-admin/sponsors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SponsorsController {
  constructor(private readonly sponsorsService: SponsorsService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  listSponsors(@CurrentUser() user: any) {
    // On extrait explicitement la chaîne de caractères
    const associationId = user.associationId; 
    return this.sponsorsService.listSponsors(associationId);
  }

  @Post()
  @Roles(UserRole.SUPER_ADMIN)
  createSponsor(
    @CurrentUser() user: any,
    @Body() dto: CreateSponsorDto
  ) {
    const associationId = user.associationId;
    return this.sponsorsService.createSponsor(associationId, dto);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  updateSponsor(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateSponsorDto
  ) {
    const associationId = user.associationId;
    return this.sponsorsService.updateSponsor(associationId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  deleteSponsor(
    @CurrentUser() user: any,
    @Param('id') id: string
  ) {
    const associationId = user.associationId;
    return this.sponsorsService.deleteSponsor(associationId, id);
  }
}