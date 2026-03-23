// backend/src/modules/public/public.module.ts
import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthMailerService } from '../auth/auth.mailer.service';
import { NotificationsModule } from '../notifications/notifications.module'; // <-- Ajouté

@Module({
  imports: [NotificationsModule], // <-- Injection
  controllers: [PublicController],
  providers: [PrismaService, PublicService, AuthMailerService], 
})
export class PublicModule {}