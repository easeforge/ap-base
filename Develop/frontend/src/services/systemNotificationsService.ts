/**
 * 系統通知服務
 * System Notifications Service
 *
 * 注意: axios 攔截器會自動從 localStorage 讀取 txn_token 並添加到所有請求的 header
 * Service 層不需要手動傳遞 txn_token 參數
 */

import axios from '../api/axios';
import { I18nField } from '../types';

const BASE_URL = '/api/system_notifications';

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
  updated_at?: string;
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

export interface TodayNotificationsResponse {
  notifications: SystemNotification[];
}

/**
 * 取得系統通知列表
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const getSystemNotifications = async (params?: {
  skip?: number;
  limit?: number;
  is_active?: boolean;
  notice_order?: number;
  search?: string;
}): Promise<SystemNotification[]> => {
  const response = await axios.get<SystemNotification[]>(`${BASE_URL}/`, { params });
  return response.data;
};

/**
 * 取得單一系統通知
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const getSystemNotification = async (notificationId: number): Promise<SystemNotification> => {
  const response = await axios.get<SystemNotification>(`${BASE_URL}/${notificationId}`);
  return response.data;
};

/**
 * 建立系統通知
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const createSystemNotification = async (data: SystemNotificationCreate): Promise<SystemNotification> => {
  const response = await axios.post<SystemNotification>(`${BASE_URL}/`, data);
  return response.data;
};

/**
 * 更新系統通知
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const updateSystemNotification = async (
  notificationId: number,
  data: SystemNotificationUpdate
): Promise<SystemNotification> => {
  const response = await axios.put<SystemNotification>(`${BASE_URL}/${notificationId}`, data);
  return response.data;
};

/**
 * 刪除系統通知
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const deleteSystemNotification = async (notificationId: number): Promise<void> => {
  await axios.delete(`${BASE_URL}/${notificationId}`);
};

/**
 * 切換通知啟用狀態
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const toggleSystemNotificationActive = async (notificationId: number): Promise<SystemNotification> => {
  const response = await axios.patch<SystemNotification>(`${BASE_URL}/${notificationId}/toggle-active`);
  return response.data;
};

/**
 * 取得今日應顯示的通知（用於 Home 頁面）
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const getHomeNotifications = async (): Promise<TodayNotificationsResponse> => {
  const response = await axios.get<TodayNotificationsResponse>(`${BASE_URL}/home/notifications`);
  return response.data;
};

/**
 * 標記今日不再顯示通知
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const closeNotificationsToday = async (closedAt?: string): Promise<void> => {
  await axios.post(`${BASE_URL}/close-today`, { closed_at: closedAt });
};
