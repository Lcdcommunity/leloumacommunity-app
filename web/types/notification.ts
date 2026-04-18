// web/types/notification.ts
export interface NotificationItem {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type?: string | null; 
  metadata?: Record<string, unknown> | null; 
}