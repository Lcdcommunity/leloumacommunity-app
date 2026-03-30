// backend/src/common/constants/permissions.ts

export const PERMISSIONS = {
  // --- UTILISATEURS & ACCÈS ---
  USERS_READ: 'users.read',
  USERS_MANAGE: 'users.manage',

  // --- ADHÉSIONS (MEMBERSHIPS) ---
  MEMBERSHIPS_APPROVE: 'memberships.approve',
  MEMBERSHIPS_READ: 'memberships.read',

  // --- COTISATIONS (CONTRIBUTIONS) ---
  CONTRIBUTIONS_VALIDATE: 'contributions.validate',
  CONTRIBUTIONS_READ_ALL: 'contributions.read_all',

  // --- FINANCES & COMPTABILITÉ (LEDGER / EXPENSES) ---
  LEDGER_READ: 'ledger.read',
  EXPENSES_MANAGE: 'expenses.manage', // Création/Suppression par l'Antenne
  EXPENSES_VALIDATE: 'expenses.validate', // Validation par le Super Admin

  // --- CONTENU & DOCUMENTS ---
  DOCUMENTS_MANAGE: 'documents.manage',
  NEWS_MANAGE: 'news.manage',
  FILES_UPLOAD: 'files.upload',

  // --- ÉVÉNEMENTS & SPONSORS ---
  EVENTS_MANAGE: 'events.manage',
  SPONSORS_MANAGE: 'sponsors.manage',

  // --- PROJETS & VOTES (PROPOSALS) ---
  PROPOSALS_REVIEW: 'proposals.review',
  PROPOSALS_CLOSE_VOTE: 'proposals.close_vote',
  PROJECTS_MANAGE: 'projects.manage',
  PROJECTIONS_MANAGE: 'projections.manage',

  // --- ADMINISTRATION & SYSTÈME ---
  DASHBOARD_ADMIN: 'dashboard.admin',
  AUDIT_READ: 'audit.read', // 👈 Indispensable pour ton module Audit
  JOBS_RUN: 'jobs.run',     // 👈 Pour lancer les tâches manuelles (Purge, Snapshots)
  
  // --- DROITS DU "GRAND CHEF" (SYSTEM ADMIN) ---
  ASSOCIATIONS_MANAGE: 'associations.manage', // 👈 Créer/Editer des associations
  SYSTEM_SETTINGS: 'system.settings',         // 👈 Configuration globale du SaaS
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];