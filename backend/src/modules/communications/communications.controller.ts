// backend/src/modules/communications/communications.controller.ts
//
// v1.0 — Fichier neuf, isolé. Guards/décorateurs identiques à
//   admin.controller.ts (JwtAuthGuard + RolesGuard + @CurrentUser()), pour
//   rester cohérent avec le reste de l'app sans dépendre du module admin.
//
import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { CommunicationsService } from './communications.service';
import { SendCommunicationDto } from './dto/send-communication.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('communications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ANTENNA_ADMIN, UserRole.SUPER_ADMIN)
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService) {}

  // Super admin : dropdown "toutes les antennes / une antenne précise".
  // Sans effet néfaste pour un admin d'antenne (retourne juste ses propres
  // antennes), donc pas besoin de restreindre la route par rôle ici.
  @Get('antennas')
  getAntennas(@CurrentUser() user: AuthUser) {
    return this.service.getAntennas(user.id);
  }

  @Get('late-members')
  getLateMembers(@CurrentUser() user: AuthUser, @Query('antennaId') antennaId?: string) {
    return this.service.getLateMembers(user.id, antennaId);
  }

  @Get('members')
  getAllMembers(
    @CurrentUser() user: AuthUser,
    @Query('antennaId') antennaId?: string,
    @Query('q') q?: string,
  ) {
    return this.service.getAllMembers(user.id, antennaId, q);
  }

  @Post('send')
  send(@CurrentUser() user: AuthUser, @Body() dto: SendCommunicationDto) {
    return this.service.sendCampaign(user.id, dto);
  }
}