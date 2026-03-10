//backend/src/modules/public/public.module.ts
import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthMailerService } from '../auth/auth.mailer.service';

@Module({
  controllers: [PublicController],
  // 👈 Ajout du AuthMailerService dans les providers
  providers: [PrismaService, PublicService, AuthMailerService], 
})
export class PublicModule {}