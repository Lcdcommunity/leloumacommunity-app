// backend/src/modules/permissions/permissions.service.ts
import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PERMISSIONS } from '../../common/constants/permissions';

@Injectable()
export class PermissionsService {
  /**
   * Retourne la liste des permissions par défaut attribuées à un rôle.
   */
  getDefaultPermissionsForRole(role: UserRole): string[] {
    switch (role) {
      case UserRole.SYSTEM_ADMIN:
        // 🔥 AJOUT CHIRURGICAL : Le Grand Chef a accès à TOUT, 
        // y compris la gestion des associations elles-mêmes.
        return Object.values(PERMISSIONS);

      case UserRole.SUPER_ADMIN:
        // Le Super Admin possède l'intégralité des droits de SON association
        return Object.values(PERMISSIONS);

      case UserRole.ANTENNA_ADMIN:
        // L'Admin Antenne gère uniquement les membres et données de son antenne
        return [
          PERMISSIONS.USERS_READ,
          PERMISSIONS.USERS_MANAGE,
          PERMISSIONS.MEMBERSHIPS_APPROVE,
          PERMISSIONS.CONTRIBUTIONS_VALIDATE,
          PERMISSIONS.CONTRIBUTIONS_READ_ALL,
          PERMISSIONS.DOCUMENTS_MANAGE,
          PERMISSIONS.NEWS_MANAGE,
          PERMISSIONS.PROPOSALS_REVIEW,
          PERMISSIONS.PROPOSALS_CLOSE_VOTE,
          PERMISSIONS.PROJECTS_MANAGE,
          PERMISSIONS.PROJECTIONS_MANAGE,
          PERMISSIONS.DASHBOARD_ADMIN,
          PERMISSIONS.FILES_UPLOAD,
        ];

      case UserRole.MEMBER:
      default:
        // Le membre n'a par défaut que le droit d'uploader ses preuves de paiement
        return [PERMISSIONS.FILES_UPLOAD];
    }
  }
}