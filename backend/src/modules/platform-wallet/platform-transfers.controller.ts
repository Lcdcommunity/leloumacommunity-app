// backend/src/modules/platform-wallet/platform-transfers.controller.ts
//
// v1.0 — Virements de commission, côté association.
//   • ANTENNA_ADMIN : seul rôle autorisé à créer / annuler (il détient le bouton de virement).
//   • SUPER_ADMIN   : lecture seule (options + liste).
//
import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { PlatformTransfersService } from './platform-transfers.service';
import { CreatePlatformTransferDto, ListPlatformTransfersQueryDto } from './dto/platform-wallet.dto';

@Controller('platform-transfers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlatformTransfersController {
  constructor(private readonly service: PlatformTransfersService) {}

  @Get('options')
  @Roles(UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN)
  options(@CurrentUser() user: AuthUser) {
    return this.service.options(user);
  }

  @Get()
  @Roles(UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN)
  list(@CurrentUser() user: AuthUser, @Query() q: ListPlatformTransfersQueryDto) {
    return this.service.listMine(user, q);
  }

  @Post()
  @Roles(UserRole.ANTENNA_ADMIN)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePlatformTransferDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ANTENNA_ADMIN)
  cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.cancel(user, id);
  }
}
