//////// backend/src/modules/jobs/jobs.controller.ts
import { Controller, Post, Get, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { JobsService } from './jobs.service';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';

// 🔥 CORRECTION : @UseGuards retiré du niveau controller (comme pour
// DomainProvisioningController) et redescendu sur chacune des 3 routes
// manuelles ci-dessous. Ça libère la nouvelle route 'run-scheduled' pour
// qu'elle échappe complètement au JWT — un cron externe (cron-job.org,
// GitHub Actions...) n'a pas de session, seulement JOBS_SECRET en Bearer.
@Controller('jobs')
export class JobsController {
  constructor(private readonly service: JobsService) {}

  /**
   * Purge globale des tokens.
   * 🛡️ RÉSERVÉ AU SYSTEM_ADMIN (Grand Chef)
   */
  @Post('purge-auth-tokens')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  purgeAuthTokens() {
    return this.service.purgeExpiredAuthTokens();
  }

  /**
   * Génération des snapshots de solde.
   * 🛡️ ACCÈS : System Admin (Global) ou Super Admin (Sa propre asso)
   */
  @Post('generate-balance-snapshots')
  @UseGuards(JwtAuthGuard, RolesGuard)
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.SUPER_ADMIN)
  notifyLateMembers(@CurrentUser() user: AuthUser) {
    // 🔒 Cloisonnement : Un Super Admin ne peut notifier que ses propres membres
    const targetAssoId = user.role === UserRole.SYSTEM_ADMIN ? undefined : user.associationId;
    return this.service.checkAndNotifyLateMembers(targetAssoId);
  }

  /**
   * 🔥 AJOUT : point d'entrée pour un cron externe (cron-job.org, GitHub
   * Actions...). Exécute les 3 jobs pour TOUTES les associations (pas de
   * cloisonnement ici, contrairement aux routes manuelles ci-dessus — un
   * cron n'a pas d'associationId à qui se rattacher, c'est le rôle même
   * de cette route de tout couvrir).
   *
   * Pas de JWT : protégée par JOBS_SECRET en Bearer, comme /domain-provisioning/check
   * l'est par CRON_SECRET. JOBS_ENABLED sert de coupe-circuit rapide —
   * le mettre à autre chose que 'true' désactive tous les jobs planifiés
   * sans avoir à toucher au code ni à redéployer.
   */
  @Get('run-scheduled')
  async runScheduled(@Headers('authorization') auth: string) {
    if (process.env.JOBS_ENABLED !== 'true') {
      return { skipped: true, reason: 'JOBS_ENABLED désactivé' };
    }
    if (auth !== `Bearer ${process.env.JOBS_SECRET}`) {
      throw new UnauthorizedException();
    }

    const [purged, snapshots, lateMembers] = await Promise.all([
      this.service.purgeExpiredAuthTokens(),
      this.service.generateBalanceSnapshots(),
      this.service.checkAndNotifyLateMembers(),
    ]);

    return { purged, snapshots, lateMembers };
  }
}