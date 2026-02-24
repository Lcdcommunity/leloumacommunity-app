//src/common/constants/permissions.ts
export const PERMISSIONS = {
  USERS_READ: 'users.read',
  USERS_MANAGE: 'users.manage',

  MEMBERSHIPS_APPROVE: 'memberships.approve',

  CONTRIBUTIONS_VALIDATE: 'contributions.validate',
  CONTRIBUTIONS_READ_ALL: 'contributions.read_all',

  DOCUMENTS_MANAGE: 'documents.manage',
  NEWS_MANAGE: 'news.manage',

  PROPOSALS_REVIEW: 'proposals.review',
  PROPOSALS_CLOSE_VOTE: 'proposals.close_vote',
  PROJECTS_MANAGE: 'projects.manage',

  PROJECTIONS_MANAGE: 'projections.manage',

  DASHBOARD_ADMIN: 'dashboard.admin',
  JOBS_RUN: 'jobs.run',

  FILES_UPLOAD: 'files.upload',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];