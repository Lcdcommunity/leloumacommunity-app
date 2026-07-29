/////// backend/src/modules/system-admin/system-admin.controller.ts
import { 
  Controller, 
  Post, 
  Get, 
  Patch, 
  Delete,
  Body, 
  Param, 
  UseGuards 
} from '@nestjs/common';
import { SystemAdminService, CreateAssociationPayload, UpdatePlatformSettingsPayload } from './system-admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('system-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SystemAdminController {
  constructor(private readonly systemAdminService: SystemAdminService) {}

  @Post('associations')
  @Roles(UserRole.SYSTEM_ADMIN)
  createAssociation(@Body() data: CreateAssociationPayload) {
    return this.systemAdminService.createAssociationWithSuperAdmin(data);
  }

  @Get('dashboard')
  @Roles(UserRole.SYSTEM_ADMIN)
  getDashboard() {
    return this.systemAdminService.getSystemDashboard();
  }

  @Get('audit-logs')
  @Roles(UserRole.SYSTEM_ADMIN)
  getAuditLogs() {
    return this.systemAdminService.getAuditLogs();
  }

  @Get('associations/:id')
  @Roles(UserRole.SYSTEM_ADMIN)
  getOne(@Param('id') id: string) {
    return this.systemAdminService.getAssociationById(id);
  }

  @Patch('associations/:id')
  @Roles(UserRole.SYSTEM_ADMIN)
  updateAssociationDetails(
    @Param('id') id: string,
    @Body() data: { name?: string; code?: string; domainName?: string }
  ) {
    return this.systemAdminService.updateAssociationDetails(id, data);
  }

  @Patch('associations/:id/status')
  @Roles(UserRole.SYSTEM_ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean
  ) {
    return this.systemAdminService.updateAssociationStatus(id, isActive);
  }

  @Delete('associations/:id')
  @Roles(UserRole.SYSTEM_ADMIN)
  deleteAssociation(@Param('id') id: string) {
    return this.systemAdminService.deleteAssociation(id);
  }

  // 🔥 AJOUT : réglages plateforme (nom, email de contact, mode maintenance)
  @Get('settings')
  @Roles(UserRole.SYSTEM_ADMIN)
  getSettings() {
    return this.systemAdminService.getPlatformSettings();
  }

  @Patch('settings')
  @Roles(UserRole.SYSTEM_ADMIN)
  updateSettings(@Body() data: UpdatePlatformSettingsPayload) {
    return this.systemAdminService.updatePlatformSettings(data);
  }
}