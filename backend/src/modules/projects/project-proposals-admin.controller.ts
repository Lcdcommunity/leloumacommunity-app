// backend/src/modules/projects/project-proposals-admin.controller.ts
// v1.0 — NOUVEAU FICHIER
// 🔥 NOUVEAU : contrôleur isolé, ne touche pas à projects.controller.ts existant.
// Monté sur le même préfixe que celui déjà utilisé par le frontend pour les
// propositions (`/admin/project-proposals`, cf. api-client.ts :
// listProjectProposals / approveProjectProposal / rejectProjectProposal).
// Réservé SUPER_ADMIN (+ SYSTEM_ADMIN par cohérence avec le reste du module).

import { Controller, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ProjectProposalsAdminService, UpdateProposalAdminInput } from './project-proposals-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('admin/project-proposals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectProposalsAdminController {
  constructor(private readonly service: ProjectProposalsAdminService) {}

  @Patch(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateProposalAdminInput,
  ) {
    return this.service.update(id, user.associationId, body);
  }

  @Delete(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(id, user.associationId);
  }
}