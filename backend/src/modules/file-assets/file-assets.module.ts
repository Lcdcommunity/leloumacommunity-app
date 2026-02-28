//backend/src/modules/file-assets/file-assets.module.ts
import { Module } from '@nestjs/common';
import { FileAssetsController } from './file-assets.controller';
import { FileAssetsService } from './file-assets.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [FileAssetsController],
  providers: [FileAssetsService, PrismaService],
  exports: [FileAssetsService],
})
export class FileAssetsModule {}