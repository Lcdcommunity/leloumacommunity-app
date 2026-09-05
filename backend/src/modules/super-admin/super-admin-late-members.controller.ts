// backend/src/modules/super-admin/super-admin-late-members.controller.ts
//
// Contrôleur isolé (cf. convention du projet) pour la route d'export
// "Retardataires" du Super Admin. Même garde JWT + rôles que
// super-admin.controller.ts. Route volontairement séparée de
// SuperAdminController pour ne pas toucher au fichier existant.
//
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SuperAdminLateMembersService } from './super-admin-late-members.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN)
export class SuperAdminLateMembersController {
  constructor(private readonly service: SuperAdminLateMembersService) {}

  // GET /super-admin/late-members            → tous les retardataires (toutes antennes)
  // GET /super-admin/late-members?antennaId=X → uniquement ceux de l'antenne X
  @Get('late-members')
  listLateMembers(
    @CurrentUser() actor: AuthUser,
    @Query('antennaId') antennaId?: string,
  ) {
    return this.service.listLateMembers(actor.associationId, antennaId || undefined);
  }
}