// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join, isAbsolute } from 'path';

// Config & Guards
import authConfig from './config/auth.config';
import rateLimitConfig from './config/rate-limit.config';
import storageConfig from './config/storage.config';
import swaggerConfig from './config/swagger.config';
import { validateEnv } from './config/validate-env';
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';

// Core & Shared Modules
import { PrismaModule } from './prisma/prisma.module';

// Feature Modules
import { AuthModule } from './modules/auth/auth.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { FileAssetsModule } from './modules/file-assets/file-assets.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { ContributionsModule } from './modules/contributions/contributions.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { EventsModule } from './modules/events/events.module';
import { SponsorsModule } from './modules/sponsors/sponsors.module';
import { TransfersModule } from './modules/transfers/transfers.module';
// 🔥 NOUVEAU : vue lecture seule des virements pour SUPER_ADMIN (toutes antennes)
import { SuperAdminTransfersModule } from './modules/transfers/super-admin-transfers.module';
import { SystemAdminModule } from './modules/system-admin/system-admin.module';
import { PublicModule } from './modules/public/public.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MemberModule } from './modules/member/member.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { AssociationsModule } from './modules/associations/associations.module';
import { AdminModule } from './modules/admin/admin.module';
import { UsersModule } from './modules/users/users.module';
import { ElectionsModule } from './modules/elections/elections.module';
// 🔥 NOUVEAU : provisioning automatique des domaines custom (Cloudflare + Vercel)
import { DomainProvisioningModule } from './domain-provisioning/domain-provisioning.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [authConfig, rateLimitConfig, storageConfig, swaggerConfig],
    }),
    ServeStaticModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const configuredUploadDir =
          config.get<string>('storage.local.uploadDir') || './uploads';
        const rootPath = isAbsolute(configuredUploadDir)
          ? configuredUploadDir
          : join(process.cwd(), configuredUploadDir);
        return [{ rootPath, serveRoot: '/static' }];
      },
    }),
    ThrottlerModule.forRoot([{
      ttl:   Number(process.env.THROTTLE_TTL   ?? 60)  * 1000,
      limit: Number(process.env.THROTTLE_LIMIT ?? 120),
    }]),
    ScheduleModule.forRoot(),
    PrismaModule,

    // --- MODULES MÉTIER ---
    PermissionsModule,
    PreferencesModule,
    AuthModule,
    UploadsModule,
    SchedulerModule,
    NotificationsModule,
    JobsModule,
    FileAssetsModule,
    LedgerModule,
    ContributionsModule,
    ProjectsModule,
    ExpensesModule,
    EventsModule,
    SponsorsModule,
    TransfersModule,
    SuperAdminTransfersModule, // 🔥 NOUVEAU
    SystemAdminModule,
    PublicModule,
    DashboardModule,
    MemberModule,
    SuperAdminModule,
    AssociationsModule,
    AdminModule,
    UsersModule,
    ElectionsModule,
    DomainProvisioningModule, // 🔥 NOUVEAU
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule {}