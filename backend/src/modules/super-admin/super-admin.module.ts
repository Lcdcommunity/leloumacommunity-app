// backend/src/modules/super-admin/super-admin.module.ts
// 🔥 AJOUT : ProjectProposalsAdminController/Service déclarés ici (module
// isolé, cf. project-proposals-admin.controller.ts / .service.ts) — logique
// réservée SUPER_ADMIN/SYSTEM_ADMIN, donc rattachée à ce module plutôt qu'à
// admin.module.ts, même si sa route reste `/admin/project-proposals/:id`
// (pour matcher ce que le frontend appelle déjà via api-client.ts).
// 🔥 AJOUT : SuperAdminLateMembersController/Service (fichiers isolés,
// export "Retardataires" de super-admin/members/page.tsx).
import { Module } from '@nestjs/common';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthMailerService } from '../auth/auth.mailer.service';
import { NotificationsModule } from '../notifications/notifications.module';

// ⚡ IMPORTS CHIRURGICAUX POUR LES ÉLECTIONS
import { SuperAdminElectionsController } from './super-admin-elections.controller';
import { SuperAdminElectionsService } from './super-admin-elections.service';

// 🔥 AJOUT : modifier/supprimer une proposition de projet (Super Admin)
import { ProjectProposalsAdminController } from '../projects/project-proposals-admin.controller';
import { ProjectProposalsAdminService } from '../projects/project-proposals-admin.service';

// 🔥 AJOUT : export "Retardataires" (Super Admin) — fichiers isolés
import { SuperAdminLateMembersController } from './super-admin-late-members.controller';
import { SuperAdminLateMembersService } from './super-admin-late-members.service';

@Module({
  imports: [NotificationsModule],
  controllers: [
    SuperAdminController,
    SuperAdminElectionsController, // ⚡ Ajout du contrôleur des élections
    ProjectProposalsAdminController, // 🔥 Ajout : modifier/supprimer proposition
    SuperAdminLateMembersController, // 🔥 Ajout : export retardataires
  ],
  providers: [
    SuperAdminService,
    SuperAdminElectionsService,    // ⚡ Ajout du service des élections
    PrismaService,
    AuthMailerService, // 🔥 CORRECTION : remplace MailService, plus utilisé par SuperAdminService
    ProjectProposalsAdminService,  // 🔥 Ajout : modifier/supprimer proposition
    SuperAdminLateMembersService,  // 🔥 Ajout : export retardataires
  ],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}