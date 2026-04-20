/////// backend/src/modules/admin/admin-elections.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminElectionsService } from './admin-elections.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('admin/elections')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ANTENNA_ADMIN) // 🔒 Sécurité : Uniquement pour l'Admin d'Antenne
export class AdminElectionsController {
  constructor(private readonly service: AdminElectionsService) {}

  @Get()
  listElections(@CurrentUser() user: AuthUser) {
    return this.service.listElections(user.associationId);
  }
}