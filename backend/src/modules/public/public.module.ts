//backend/src/modules/public/public.module.ts
import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [PublicController],
  providers: [PrismaService, PublicService], // 👈 On ajoute le service ici
})
export class PublicModule {}