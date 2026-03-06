// backend/src/modules/audit/audit.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, AuditAction } from '@prisma/client';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
// 👇 LA SOLUTION : On autorise aussi les ANTENNA_ADMIN !
@Roles(UserRole.SUPER_ADMIN, UserRole.ANTENNA_ADMIN) 
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthUser,
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 100,
    @Query('action') action?: AuditAction,
  ) {
    // Note: Vous devrez ajouter une vraie méthode list() dans votre AuditService
    // En attendant, on renvoie une liste vide pour éviter l'erreur sur le Frontend.
    return { items: [], total: 0 }; 
  }
}