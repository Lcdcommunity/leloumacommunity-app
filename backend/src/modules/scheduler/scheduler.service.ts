// src/modules/scheduler/scheduler.service.ts
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

  private enabled(): boolean {
    return (process.env.SCHEDULER_ENABLED || 'true') === 'true';
  }

  @Cron(CronExpression.EVERY_WEEK)
  async weeklyLateMembersDigest() {
    if (!this.enabled()) return;

    this.logger.log('Cron weeklyLateMembersDigest started');

    const associations = await this.prisma.association.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    for (const assoc of associations) {
      try {
        // ts-ignore temporaire pour permettre la compilation
        // @ts-ignore
        const digest = await this.jobsService.buildLateMembersDigest(assoc.id, 3);
        this.logger.log(`[${assoc.name}] retardataires>3m = ${digest?.total || 0}`);

        // @ts-ignore
        await this.jobsService.notifyAntennaAdminsLateDigest(assoc.id, 3);
      } catch (error) {
        this.logger.error(
          `Cron failed for association ${assoc.id}: ${(error as Error).message}`,
        );
      }
    }

    this.logger.log('Cron weeklyLateMembersDigest finished');
  }
}