//src/modules/permissions/permissions.servive.ts
import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PERMISSIONS } from '../../common/constants/permissions';

@Injectable()
export class PermissionsService {
  getDefaultPermissionsForRole(role: UserRole): string[] {
    switch (role) {
      case UserRole.SUPER_ADMIN:
        return Object.values(PERMISSIONS);

      case UserRole.ANTENNA_ADMIN:
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
        return [PERMISSIONS.FILES_UPLOAD];
    }
  }
}