// backend/src/modules/platform-wallet/platform-wallet.controller.ts
//
// v1.0 — Console du Grand Chef : wallet de la plateforme et validation des commissions reçues.
//   Réservé à SYSTEM_ADMIN.
//
import { Body, Controller, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { PlatformWalletService } from './platform-wallet.service';
import { PlatformTransfersService } from './platform-transfers.service';
import {
  CreateWalletMovementDto,
  ListPlatformTransfersQueryDto,
  ListWalletEntriesQueryDto,
  RejectPlatformTransferDto,
  UpdateWalletSettingsDto,
} from './dto/platform-wallet.dto';

@Controller('platform-wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SYSTEM_ADMIN)
export class PlatformWalletController {
  constructor(
    private readonly wallet: PlatformWalletService,
    private readonly transfers: PlatformTransfersService,
  ) {}

  @Get('overview')
  overview() {
    return this.wallet.overview();
  }

  @Get('entries')
  entries(@Query() q: ListWalletEntriesQueryDto) {
    return this.wallet.listEntries(q);
  }

  @Post('entries')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  createMovement(@CurrentUser() user: AuthUser, @Body() dto: CreateWalletMovementDto) {
    return this.wallet.createMovement(user.id, dto);
  }

  @Get('transfers')
  transfersList(@Query() q: ListPlatformTransfersQueryDto) {
    return this.transfers.listAll(q);
  }

  @Patch('transfers/:id/validate')
  validate(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.transfers.validate(user, id);
  }

  @Patch('transfers/:id/reject')
  reject(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: RejectPlatformTransferDto) {
    return this.transfers.reject(user, id, dto.reason);
  }

  @Get('settings')
  async settings() {
    return { currencies: await this.wallet.getCurrencies() };
  }

  @Put('settings')
  updateSettings(@CurrentUser() user: AuthUser, @Body() dto: UpdateWalletSettingsDto) {
    return this.wallet.updateCurrencies(dto.currencies, user.id);
  }
}
