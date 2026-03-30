// backend/src/modules/scheduler/scheduler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { JobsService } from '../jobs/jobs.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobsService: JobsService,
  ) {}

  /**
   * Vérifie si le scheduler est activé dans l'environnement.
   */
  private enabled(): boolean {
    return (process.env.SCHEDULER_ENABLED || 'true') === 'true';
  }

  /**
   * 🕒 CHAQUE SEMAINE (Lundi à minuit) :
   * Détecte les membres en retard de cotisation et alerte les admins d'antenne.
   */
  @Cron(CronExpression.EVERY_WEEK)
  async weeklyLateMembersDigest() {
    if (!this.enabled()) return;

    this.logger.log('[CRON] Début du rapport hebdomadaire des membres en retard...');

    const associations = await this.prisma.association.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    for (const assoc of associations) {
      try {
        const result = await this.jobsService.checkAndNotifyLateMembers(assoc.id);
        this.logger.log(`[${assoc.name}] Alertes envoyées : ${result.notificationsSent}`);
      } catch (error) {
        this.logger.error(
          `[${assoc.name}] Échec du cron LateMembers : ${(error as Error).message}`,
        );
      }
    }

    this.logger.log('[CRON] Rapport hebdomadaire terminé.');
  }

  /**
   * 🕒 CHAQUE JOUR (À minuit) :
   * Nettoie les tokens de sécurité expirés ou consommés.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailySecurityCleanup() {
    if (!this.enabled()) return;

    this.logger.log('[CRON] Purge des tokens de sécurité...');
    try {
      const res = await this.jobsService.purgeExpiredAuthTokens();
      this.logger.log(`[SYSTEM] ${res.cleaned} tokens purgés avec succès.`);
    } catch (error) {
      this.logger.error(`[SYSTEM] Échec de la purge des tokens : ${(error as Error).message}`);
    }
  }

  /**
   * 🕒 CHAQUE JOUR (À 1h du matin) :
   * Génère les snapshots de solde pour toutes les associations actives (Reporting).
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async dailyBalanceSnapshots() {
    if (!this.enabled()) return;

    this.logger.log('[CRON] Génération des snapshots financiers...');
    try {
      const res = await this.jobsService.generateBalanceSnapshots();
      this.logger.log(`[SYSTEM] Snapshots créés pour ${res.updated} associations.`);
    } catch (error) {
      this.logger.error(`[SYSTEM] Échec des snapshots financiers : ${(error as Error).message}`);
    }
  }
}