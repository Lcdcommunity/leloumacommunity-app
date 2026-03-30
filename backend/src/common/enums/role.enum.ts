// backend/src/common/enums/role.enum.ts

export enum RoleEnum {
  /**
   * SYSTEM_ADMIN : Le "Grand Chef" / Propriétaire de la plateforme SaaS.
   * Il gère les associations, les abonnements et la maintenance globale.
   */
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',

  /**
   * SUPER_ADMIN : Le président ou responsable d'une association.
   * Il a tout pouvoir au sein de sa propre instance (association).
   */
  SUPER_ADMIN = 'SUPER_ADMIN',

  /**
   * ANTENNA_ADMIN : Le responsable d'une antenne locale.
   * Ses droits sont limités au périmètre de son antenne.
   */
  ANTENNA_ADMIN = 'ANTENNA_ADMIN',

  /**
   * MEMBER : Utilisateur standard de l'association.
   */
  MEMBER = 'MEMBER',
}