// backend/src/modules/jobs/jobs.controller.ts
import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleEnum } from '../../common/enums/role.enum';
import { JobsService } from './jobs.service';

@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.SUPER_ADMIN) // Seul le Super Admin a le droit de lancer ces tâches manuellement
export class JobsController {
  constructor(private readonly service: JobsService) {}

  @Post('purge-auth-tokens')
  purgeAuthTokens() {
    // Fait appel à la méthode renommée dans le service
    return this.service.purgeExpiredAuthTokens();
  }

  @Post('generate-balance-snapshots')
  generateBalanceSnapshots() {
    // Fait appel à la méthode de génération des soldes (snapshots)
    return this.service.generateBalanceSnapshots();
  }

  @Post('notify-late-members')
  notifyLateMembers() {
    // ✅ Nouvelle route pour déclencher manuellement l'alerte des membres en retard
    return this.service.checkAndNotifyLateMembers();
  }
}