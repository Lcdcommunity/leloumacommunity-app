// backend/src/modules/public/public.module.ts
//
// v1.1 — 🔥 AJOUT : enregistrement de PublicCardsController (GET /public/cards/:token,
//   vérification du QR code des cartes membres — route manquante jusqu'ici).
//
import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicCardsController } from './public-cards.controller';
import { PublicService } from './public.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthMailerService } from '../auth/auth.mailer.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [NotificationsModule, UploadsModule],
  controllers: [PublicController, PublicCardsController],
  providers: [PrismaService, PublicService, AuthMailerService],
})
export class PublicModule {}