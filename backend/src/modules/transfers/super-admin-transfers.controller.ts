
// backend/src/modules/transfers/super-admin-transfers.controller.ts
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { SuperAdminTransfersService } from './super-admin-transfers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('super-admin/transfers')
@UseGuards(JwtAuthGuard)
export class SuperAdminTransfersController {
  constructor(private readonly service: SuperAdminTransfersService) {}

  /** Vue globale en lecture seule : tous les virements, toutes antennes confondues */
  @Get()
  listAll(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('status') status?: string,
    @Query('antennaId') antennaId?: string,
  ) {
    return this.service.listAll(req.user.id, {
      page: +page,
      pageSize: +pageSize,
      status,
      antennaId,
    });
  }
}