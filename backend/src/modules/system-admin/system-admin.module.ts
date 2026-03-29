// backend/src/modules/system-admin/system-admin.module.ts
import { Module } from '@nestjs/common';
import { SystemAdminController } from './system-admin.controller';
import { SystemAdminService } from './system-admin.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailService } from '../../common/services/mail.service'; 

@Module({
  imports: [PrismaModule],
  controllers: [SystemAdminController],
  providers: [SystemAdminService, MailService], 
  exports: [SystemAdminService],
})
export class SystemAdminModule {}