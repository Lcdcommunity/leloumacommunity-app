//src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import authConfig from './config/auth.config';
import rateLimitConfig from './config/rate-limit.config';
import storageConfig from './config/storage.config';
import swaggerConfig from './config/swagger.config';
import { validateEnv } from './config/validate-env';

import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';

// modules existants...
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';

// + tes modules Packs 1/2
import { NotificationsModule } from './modules/notifications/notifications.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { FileAssetsModule } from './modules/file-assets/file-assets.module';
// ...etc

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      load: [authConfig, rateLimitConfig, storageConfig, swaggerConfig],
    }),

    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL ?? 60) * 1000,
        limit: Number(process.env.THROTTLE_LIMIT ?? 120),
      },
    ]),

    ScheduleModule.forRoot(),

    PrismaModule,

    PermissionsModule,
    AuthModule,
    NotificationsModule,
    JobsModule,
    FileAssetsModule,
    UploadsModule,
    SchedulerModule,

    // tes autres modules Packs 1/2...
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
  ],
})
export class AppModule {}