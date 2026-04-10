/**
 * System Notifications Types
 * 系統通知類型定義
 */

export type NotificationType = 'info' | 'warning' | 'error' | 'success';
export type TargetType = 'all' | 'role' | 'user';

export interface SystemNotification {
  id: number;
  title: string;
  content: string;
  notification_type: NotificationType;
  start_time: string;
  end_time?: string | null;
  is_active: boolean;
  is_popup: boolean;
  priority: number;
  target_type: TargetType;
  target_roles: number[];
  target_users: number[];
  created_by: number;
  created_at: string;
  updated_at?: string | null;
  is_read?: boolean;
  read_at?: string | null;
}

export interface SystemNotificationCreate {
  title: string;
  content: string;
  notification_type: NotificationType;
  start_time: string;
  end_time?: string | null;
  is_active?: boolean;
  is_popup?: boolean;
  priority?: number;
  target_type?: TargetType;
  target_roles?: number[];
  target_users?: number[];
}

export interface SystemNotificationUpdate {
  title?: string;
  content?: string;
  notification_type?: NotificationType;
  start_time?: string;
  end_time?: string | null;
  is_active?: boolean;
  is_popup?: boolean;
  priority?: number;
  target_type?: TargetType;
  target_roles?: number[];
  target_users?: number[];
}

export interface UnreadNotificationsResponse {
  unread_count: number;
  notifications: SystemNotification[];
}

export interface GetNotificationsParams {
  is_active?: boolean;
  notification_type?: NotificationType;
  skip?: number;
  limit?: number;
}
