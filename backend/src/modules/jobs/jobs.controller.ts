// backend/src/modules/jobs/jobs.controller.ts
import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { JobsService } from './jobs.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobsController {
  constructor(private readonly service: JobsService) {}

  /**
   * Purge globale des tokens.
   * 🛡️ RÉSERVÉ AU SYSTEM_ADMIN (Grand Chef)
   */
  @Post('purge-auth-tokens')
  @Roles(UserRole.SYSTEM_ADMIN)
  purgeAuthTokens() {
    return this.service.purgeExpiredAuthTokens();
  }

  /**
   * Génération des snapshots de solde.
   * 🛡️ ACCÈS : System Admin (Global) ou Super Admin (Sa propre asso)
   */
  @Post('generate-balance-snapshots')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SUPER_ADMIN)
  generateBalanceSnapshots(@CurrentUser() user: AuthUser) {
    // Si c'est un Super Admin, on force son associationId. 
    // Si c'est le Grand Chef, on le laisse tout générer (undefined).
    const targetAssoId = user.role === UserRole.SYSTEM_ADMIN ? undefined : user.associationId;
    return this.service.generateBalanceSnapshots(targetAssoId);
  }

  /**
   * Déclenchement manuel des alertes de retard.
   * 🛡️ ACCÈS : System Admin ou Super Admin
   */
  @Post('notify-late-members')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SUPER_ADMIN)
  notifyLateMembers(@CurrentUser() user: AuthUser) {
    // 🔒 Cloisonnement : Un Super Admin ne peut notifier que ses propres membres
    const targetAssoId = user.role === UserRole.SYSTEM_ADMIN ? undefined : user.associationId;
    return this.service.checkAndNotifyLateMembers(targetAssoId);
  }
}