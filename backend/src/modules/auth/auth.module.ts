// backend/src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTokensService } from './auth.tokens.service';
import { AuthMailerService } from './auth.mailer.service';
import { JwtStrategy } from './jwt.strategy';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    JwtModule.register({}),
    NotificationsModule,
    PrismaModule,
  ],
  controllers: [
    AuthController,
  ],
  providers: [
    AuthService,
    AuthTokensService,
    AuthMailerService,
    JwtStrategy,
  ],
  exports: [AuthService, AuthTokensService, AuthMailerService],
})
export class AuthModule {}