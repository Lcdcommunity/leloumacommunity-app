// backend/src/modules/transfers/super-admin-transfers.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { SuperAdminTransfersService } from './super-admin-transfers.service';
import { UpdateTransferSuperAdminDto } from './dto/update-transfer-super-admin.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('super-admin/transfers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuperAdminTransfersController {
  constructor(private readonly service: SuperAdminTransfersService) {}

  /** Vue globale en lecture seule : tous les virements, toutes antennes confondues */
  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  listAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('status') status?: string,
    @Query('antennaId') antennaId?: string,
  ) {
    return this.service.listAll(user.associationId, {
      page: +page,
      pageSize: +pageSize,
      status,
      antennaId,
    });
  }

  /** Modifier un virement (montants / notes) — accessible même déjà validé */
  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTransferSuperAdminDto,
  ) {
    return this.service.updateTransfer(user.associationId, user.id, id, dto);
  }

  /** Supprimer un virement — accessible même déjà validé (nettoie le ledger associé) */
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.deleteTransfer(user.associationId, user.id, id);
  }
}