//web/types/notification.ts
export interface NotificationItem {
  id: string;
  userId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}