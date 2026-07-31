// backend/src/modules/system-admin/system-admin.module.ts
import { Module } from '@nestjs/common';
import { SystemAdminController } from './system-admin.controller';
import { SystemAdminService } from './system-admin.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../../common/services/mail.module';
import { VercelProvider } from '../../domain-provisioning/providers/vercel.provider';

@Module({
  imports: [
    PrismaModule,
    MailModule
  ],
  controllers: [SystemAdminController],
  providers: [
    SystemAdminService,
    VercelProvider,
  ],
  exports: [SystemAdminService],
})
export class SystemAdminModule {}