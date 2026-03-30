// src/modules/scheduler/scheduler.module.ts
import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { JobsModule } from '../jobs/jobs.module';
import { PrismaModule } from '../../prisma/prisma.module'; // 👈 AJOUT CHIRURGICAL

@Module({
  imports: [
    PrismaModule, // 👈 Indispensable pour injecter PrismaService
    JobsModule,   // 👈 Accès aux logiques métier (Jobs)
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}