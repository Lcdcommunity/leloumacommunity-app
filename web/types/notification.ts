//web/types/notification.ts
export interface NotificationItem {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  // Ajout des propriétés manquantes renvoyées par le service
  type?: string | null; 
  metadata?: any; 
}