//web/types/audit.ts
export interface AuditItem {
  id: string;
  associationId: string;
  actorUserId?: string | null;
  action: string;
  targetModel?: string | null;
  targetId?: string | null;
  summary?: string | null;
  metadata?: unknown;
  createdAt: string;
}