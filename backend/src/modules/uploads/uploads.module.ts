//src/modules/uploads/uploads.module.ts
import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { LocalStorageProvider } from './storage/local-storage.provider';
import { S3StorageProvider } from './storage/s3-storage.provider';
// 👇 1. Importer le module d'audit
import { AuditModule } from '../audit/audit.module'; 

@Module({
  // 👇 2. L'ajouter au tableau des imports
  imports: [AuditModule], 
  controllers: [UploadsController],
  providers: [UploadsService, LocalStorageProvider, S3StorageProvider],
  exports: [UploadsService],
})
export class UploadsModule {}