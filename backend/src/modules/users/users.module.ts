//////// backend/src/modules/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { UploadsModule } from '../uploads/uploads.module'; // Ajouté

@Module({
  imports: [
    PrismaModule, 
    AuditModule, 
    UploadsModule // Importé ici pour accéder au CloudinaryService
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}