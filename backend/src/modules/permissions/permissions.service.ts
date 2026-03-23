// backend/src/modules/permissions/permissions.service.ts
import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PERMISSIONS } from '../../common/constants/permissions';

@Injectable()
export class PermissionsService {
  /**
   * Retourne la liste des permissions par défaut attribuées à un rôle lors de sa création
   * ou de la vérification des droits d'accès.
   */
  getDefaultPermissionsForRole(role: UserRole): string[] {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        // Le Super Admin possède l'intégralité des droits du système
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
        // Le membre n'a par défaut que le droit d'uploader ses preuves de paiement (fichiers)
        // Ses autres accès sont régis par le contrôleur MemberController
        return [PERMISSIONS.FILES_UPLOAD];
    }
  }
}