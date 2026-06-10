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
import { CreateTransferDto, RejectTransferDto } from './dto/create-transfer.dto';

// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  CHOIX DU GUARD — décommente la ligne qui correspond à ton projet
// Lance : find src -name "*.guard.ts" | grep -i jwt   pour trouver le bon chemin
// ─────────────────────────────────────────────────────────────────────────────

// Option A — le plus courant dans ce type de projet NestJS
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

// Option D — si ton projet utilise un AuthGuard Passport
// import { AuthGuard } from '@nestjs/passport';
// const JwtAuthGuard = AuthGuard('jwt');

@Controller('transfers')
@UseGuards(JwtAuthGuard)
export class TransfersController {
  constructor(private readonly service: TransfersService) {}

  /** Infos sur l'antenne expéditrice (devise, nom) */
  @Get('sender-info')
  getSenderInfo(@Req() req: any) {
    return this.service.getSenderInfo(req.user.id);
  }

  /** Liste des antennes disponibles comme destinations */
  @Get('destinations')
  listDestinations(@Req() req: any) {
    return this.service.listDestinations(req.user.id);
  }

  /** Créer un virement */
  @Post()
  create(@Req() req: any, @Body() dto: CreateTransferDto) {
    return this.service.createTransfer(req.user.id, dto);
  }

  /** Virements envoyés par mon antenne */
  @Get('sent')
  listSent(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
  ) {
    return this.service.listSent(req.user.id, +page, +pageSize);
  }

  /** Virements reçus par mon antenne */
  @Get('received')
  listReceived(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '10',
    @Query('status') status?: string,
  ) {
    return this.service.listReceived(req.user.id, +page, +pageSize, status);
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

  /** Annuler un virement envoyé (avant validation) */
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.service.cancelTransfer(id, req.user.id);
  }
}