/**
 * 系統管理相關 API
 */

import axios from './axios';
import { SystemProfile, SystemCheckResponse, SystemFunction, I18nField } from '../types';

export interface RecentActivity {
  id: number;
  username: string;
  module_item: string;
  func_name: I18nField | null;
  action_at: string | null;
  has_error: boolean;
}

export interface SystemStats {
  users_count: number;
  organizations_count: number;
  recent_logins_7d: number;
  active_notifications: number;
  recent_activities: RecentActivity[];
}

export interface LicenseInfo {
  edition: 'community' | 'enterprise';
  features: string[];
  customer_id: string | null;
  customer_name: string | null;
  issued_at: string | null;
  expires_at: string | null;
  max_users: number | null;
  max_organizations: number | null;
  load_error: string | null;
  ee_loaded: boolean;
}

export const systemService = {
  /**
   * 取得系統設定
   */
  getProfile: async (): Promise<SystemProfile> => {
    const response = await axios.get('/api/system/profile');
    return response.data;
  },

  /**
   * 系統健康檢查
   */
  checkSystem: async (): Promise<SystemCheckResponse> => {
    const response = await axios.get('/api/system/check');
    return response.data;
  },

  /**
   * 取得系統功能選單
   */
  getFunctions: async (): Promise<SystemFunction[]> => {
    const response = await axios.get('/api/system/functions');
    return response.data;
  },

  /**
   * 取得首頁統計資料
   */
  getStats: async (): Promise<SystemStats> => {
    const response = await axios.get('/api/system/stats');
    return response.data;
  },

  /**
   * 取得授權資訊（公開端點，不需登入）
   */
  getLicense: async (): Promise<LicenseInfo> => {
    const response = await axios.get('/api/system/license');
    return response.data;
  },
};
