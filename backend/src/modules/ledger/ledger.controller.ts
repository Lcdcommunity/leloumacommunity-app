// backend/src/modules/ledger/ledger.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('ledger')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  @Get('balances')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ANTENNA_ADMIN)
  async getBalances(
    @CurrentUser() user: AuthUser,
    @Query('antennaId') antennaId?: string,
  ) {
    // Sécurité : Un admin d'antenne ne peut voir que les soldes de sa propre antenne.
    // Le Super Admin, lui, peut filtrer par antennaId ou voir le global s'il ne précise rien.
    const resolvedAntennaId = 
      user.role === UserRole.ANTENNA_ADMIN 
        ? user.antennaId 
        : antennaId;

    return this.ledgerService.getBalances(user.associationId, resolvedAntennaId);
  }
}