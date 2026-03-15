//////// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

// Config & Guards
import authConfig from './config/auth.config';
import rateLimitConfig from './config/rate-limit.config';
import storageConfig from './config/storage.config';
import swaggerConfig from './config/swagger.config';
import { validateEnv } from './config/validate-env';
import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';

// Core & Shared Modules
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';

// Feature Modules existants
import { AuthModule } from './modules/auth/auth.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';

// Modules récemment créés
import { NotificationsModule } from './modules/notifications/notifications.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { FileAssetsModule } from './modules/file-assets/file-assets.module';

// Nouveaux Modules & Auth Member
import { PublicModule } from './modules/public/public.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { MemberModule } from './modules/member/member.module';
import { AuthMemberController } from './modules/auth/auth-member.controller';
import { AuthMemberService } from './modules/auth/auth-member.service';

// Modules d'administration (Global & Antenne)
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { AssociationsModule } from './modules/associations/associations.module';
import { AdminModule } from './modules/admin/admin.module';

// 👇 AJOUT CHIRURGICAL : Import du module Users
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    // Configuration globale
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [authConfig, rateLimitConfig, storageConfig, swaggerConfig],
    }),

    // Sécurité & Tâches planifiées
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL ?? 60) * 1000,
        limit: Number(process.env.THROTTLE_LIMIT ?? 120),
      },
    ]),
    ScheduleModule.forRoot(),

    // Modules d'infrastructure
    PrismaModule,

    // Modules applicatifs (Métier)
    PermissionsModule,
    AuthModule,
    UploadsModule,
    SchedulerModule,
    NotificationsModule,
    JobsModule,
    FileAssetsModule,
    
    // Nouveaux modules intégrés
    PublicModule,
    DashboardModule,
    MemberModule,

    // Modules d'administration
    SuperAdminModule,
    AssociationsModule,
    AdminModule,
    
    // 👇 AJOUT CHIRURGICAL : Déclaration du module Users
    UsersModule, 
  ],
  controllers: [
    AuthMemberController,
  ],
  providers: [
    // Guard de sécurité global
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
    // Services additionnels
    AuthMemberService,
    PrismaService,
  ],
})
export class AppModule {}