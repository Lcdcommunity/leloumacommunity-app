//backend/src/modules/associations/associations.module.ts
import { Module } from '@nestjs/common';
import { AssociationsController } from './associations.controller';
import { AssociationsService } from './associations.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [AssociationsController],
  providers: [AssociationsService, PrismaService],
})
export class AssociationsModule {}