// backend/src/modules/transfers/transfers.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TransfersService } from './transfers.service';
import { CreateTransferDto, RejectTransferDto, UpdateTransferDto } from './dto/create-transfer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('transfers')
@UseGuards(JwtAuthGuard)
export class TransfersController {
  constructor(private readonly service: TransfersService) {}

  /** Antennes que l'admin gère — pour le sélecteur d'antenne expéditrice */
  @Get('my-antennas')
  listMyAntennas(@Req() req: any) {
    return this.service.listMyAntennas(req.user.id);
  }

  /** Infos sur l'antenne expéditrice (devise, nom) */
  @Get('sender-info')
  getSenderInfo(@Req() req: any, @Query('antennaId') antennaId?: string) {
    return this.service.getSenderInfo(req.user.id, antennaId);
  }

  /** Liste des antennes disponibles comme destinations */
  @Get('destinations')
  listDestinations(@Req() req: any, @Query('antennaId') antennaId?: string) {
    return this.service.listDestinations(req.user.id, antennaId);
  }

  /** Créer un virement */
  @Post()
  create(@Req() req: any, @Body() dto: CreateTransferDto) {
    return this.service.createTransfer(req.user.id, dto);
  }

  /** Virements envoyés (toutes mes antennes, ou une seule si antennaId fourni) */
  @Get('sent')
  listSent(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
    @Query('antennaId') antennaId?: string,
  ) {
    return this.service.listSent(req.user.id, +page, +pageSize, antennaId);
  }

  /** Virements reçus (toutes mes antennes, ou une seule si antennaId fourni) */
  @Get('received')
  listReceived(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
    @Query('status') status?: string,
    @Query('antennaId') antennaId?: string,
  ) {
    return this.service.listReceived(req.user.id, +page, +pageSize, status, antennaId);
  }

  /** Valider un virement reçu */
  @Patch(':id/validate')
  validate(@Param('id') id: string, @Req() req: any) {
    return this.service.validateTransfer(id, req.user.id);
  }

  /** Refuser un virement reçu */
  @Patch(':id/reject')
  reject(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: RejectTransferDto,
  ) {
    return this.service.rejectTransfer(id, req.user.id, body.reason);
  }

  /** 🔥 NOUVEAU : Modifier un virement envoyé (montants/notes), tant qu'il n'est pas validé */
  @Patch(':id')
  update(@Param('id') id: string, @Req() req: any, @Body() dto: UpdateTransferDto) {
    return this.service.updateTransfer(id, req.user.id, dto);
  }

  /** Annuler un virement envoyé (avant validation) */
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.service.cancelTransfer(id, req.user.id);
  }
}