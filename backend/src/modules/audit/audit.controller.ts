//backend/src/modules/audit/audit.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole, AuditAction } from '@prisma/client';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  async list(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 100,
    @Query('action') action?: AuditAction,
  ) {
    // Note: Vous devrez ajouter une méthode list() dans votre AuditService
    // Cette implémentation dépend de vos besoins de filtrage.
    return { items: [], total: 0 }; 
  }
}