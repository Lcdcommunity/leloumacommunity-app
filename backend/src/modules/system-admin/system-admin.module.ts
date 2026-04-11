/////// backend/src/modules/system-admin/system-admin.module.ts
import { Module } from '@nestjs/common';
import { SystemAdminController } from './system-admin.controller';
import { SystemAdminService } from './system-admin.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../../common/services/mail.module'; // 👈 Chemin d'importation corrigé !

@Module({
  imports: [
    PrismaModule,
    MailModule // 👈 Injection propre (assure que MailService est un Singleton global)
  ],
  controllers: [SystemAdminController],
  providers: [
    SystemAdminService
    // 👈 MailService est retiré d'ici, car il est fourni par MailModule
  ], 
  exports: [SystemAdminService],
})
export class SystemAdminModule {}