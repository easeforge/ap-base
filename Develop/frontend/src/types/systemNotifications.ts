/**
 * System Notifications Types
 * 系統通知類型定義（JSONB 多語系版本）
 */

import { I18nField } from './index';

export interface SystemNotification {
  id: number;
  notice_subject: I18nField;
  notice_description: I18nField;
  notice_start_at: string;
  notice_end_at: string;
  notice_order: number;
  is_active: boolean;
  edit_by: number;
  created_at: string;
  updated_at?: string | null;
}

export interface SystemNotificationCreate {
  notice_subject: I18nField;
  notice_description: I18nField;
  notice_start_at: string;
  notice_end_at: string;
  notice_order?: number;
  is_active?: boolean;
}

export interface SystemNotificationUpdate {
  notice_subject?: I18nField;
  notice_description?: I18nField;
  notice_start_at?: string;
  notice_end_at?: string;
  notice_order?: number;
  is_active?: boolean;
}

export interface NotificationCloseDateResponse {
  id: number;
  closed_at: string;
  edit_by: number;
  created_at: string;
}

export interface TodayNotificationsResponse {
  notifications: SystemNotification[];
}

export interface GetNotificationsParams {
  is_active?: boolean;
  skip?: number;
  limit?: number;
}
