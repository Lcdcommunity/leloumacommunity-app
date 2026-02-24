//src/modules/uploads/uploads.module.ts
import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { LocalStorageProvider } from './storage/local-storage.provider';
import { S3StorageProvider } from './storage/s3-storage.provider';

@Module({
  controllers: [UploadsController],
  providers: [UploadsService, LocalStorageProvider, S3StorageProvider],
  exports: [UploadsService],
})
export class UploadsModule {}