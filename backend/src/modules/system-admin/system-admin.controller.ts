// backend/src/modules/system-admin/system-admin.controller.ts
import { 
  Controller, 
  Post, 
  Get, 
  Patch, 
  Body, 
  Param, 
  UseGuards 
} from '@nestjs/common';
import { SystemAdminService, CreateAssociationPayload } from './system-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('system-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemAdminController {
  constructor(private readonly systemAdminService: SystemAdminService) {}

  /**
   * Créer une nouvelle association et son premier Super Admin
   */
  @Post('associations')
  @Roles(UserRole.SYSTEM_ADMIN)
  createAssociation(@Body() data: CreateAssociationPayload) {
    return this.systemAdminService.createAssociationWithSuperAdmin(data);
  }

  /**
   * Statistiques globales et liste simplifiée pour le dashboard
   */
  @Get('dashboard')
  @Roles(UserRole.SYSTEM_ADMIN)
  getDashboard() {
    return this.systemAdminService.getSystemDashboard();
  }

  /**
   * Historique des actions d'audit sur toute la plateforme
   */
  @Get('audit-logs')
  @Roles(UserRole.SYSTEM_ADMIN)
  getAuditLogs() {
    return this.systemAdminService.getAuditLogs();
  }

  /**
   * Détails complets d'une association spécifique
   */
  @Get('associations/:id')
  @Roles(UserRole.SYSTEM_ADMIN)
  getOne(@Param('id') id: string) {
    return this.systemAdminService.getAssociationById(id);
  }

  /**
   * Activer ou Suspendre une instance d'association
   */
  @Patch('associations/:id/status')
  @Roles(UserRole.SYSTEM_ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean
  ) {
    return this.systemAdminService.updateAssociationStatus(id, isActive);
  }
}