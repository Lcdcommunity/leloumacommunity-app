//src/modules/uploads/uploads.module.ts
import { Module } from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadsController } from './uploads.controller';
import { LocalStorageProvider } from './storage/local-storage.provider';
import { S3StorageProvider } from './storage/s3-storage.provider';
import { CloudinaryService } from './cloudinary.service'; // Importation ajoutée
import { AuditModule } from '../audit/audit.module'; 

@Module({
  imports: [AuditModule], 
  controllers: [UploadsController],
  providers: [
    UploadsService, 
    LocalStorageProvider, 
    S3StorageProvider,
    CloudinaryService // Ajouté aux providers pour que NestJS puisse l'injecter
  ],
  exports: [
    UploadsService,
    CloudinaryService // Exporté pour que UsersModule puisse aussi l'utiliser
  ],
})
export class UploadsModule {}