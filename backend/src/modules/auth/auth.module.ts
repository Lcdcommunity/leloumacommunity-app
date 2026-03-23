// src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTokensService } from './auth.tokens.service';
import { AuthMailerService } from './auth.mailer.service';
import { JwtStrategy } from './jwt.strategy';
import { NotificationsModule } from '../notifications/notifications.module'; // <-- Ajout de l'import
import { PrismaService } from '../../prisma/prisma.service'; // <-- Ajout de sécurité

@Module({
  imports: [
    JwtModule.register({}),
    NotificationsModule, // <-- Injection du module de notifications ici
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    AuthTokensService, 
    AuthMailerService, 
    JwtStrategy,
    PrismaService, // <-- Souvent requis par AuthService / AuthTokensService
  ], 
  exports: [AuthService, AuthTokensService],
})
export class AuthModule {}