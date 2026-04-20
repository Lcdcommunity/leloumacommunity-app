/////// backend/src/modules/super-admin/super-admin-elections.module.ts
import { Module } from '@nestjs/common';
import { SuperAdminElectionsController } from './super-admin-elections.controller';
import { SuperAdminElectionsService } from './super-admin-elections.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SuperAdminElectionsController],
  providers: [SuperAdminElectionsService],
  exports: [SuperAdminElectionsService],
})
export class SuperAdminElectionsModule {}