// backend/src/modules/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthMemberController } from './auth-member.controller';
import { AuthService } from './auth.service';
import { AuthMemberService } from './auth-member.service';
import { AuthTokensService } from './auth.tokens.service';
import { AuthMailerService } from './auth.mailer.service';
import { JwtStrategy } from './jwt.strategy';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module'; // ⚡ AJOUT CHIRURGICAL : Import du module d'uploads

@Module({
  imports: [
    JwtModule.register({}),
    NotificationsModule,
    PrismaModule,
    UploadsModule, // ⚡ AJOUT CHIRURGICAL : Injection du module pour que CloudinaryService soit disponible
  ],
  controllers: [
    AuthController, 
    AuthMemberController,
  ],
  providers: [
    AuthService,
    AuthMemberService,
    AuthTokensService,
    AuthMailerService,
    JwtStrategy,
  ],
  // On exporte les services pour qu'ils soient utilisables par d'autres modules
  exports: [AuthService, AuthTokensService, AuthMemberService, AuthMailerService],
})
export class AuthModule {}