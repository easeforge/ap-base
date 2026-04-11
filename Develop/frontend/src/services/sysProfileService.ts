/**
 * 系統設定服務
 *
 * 注意: axios 攔截器會自動從 localStorage 讀取 txn_token 並添加到所有請求的 header
 * Service 層不需要手動傳遞 txn_token 參數
 */

import axios from '../api/axios';
import { I18nField } from '../types';

const BASE_URL = '/api/sys_profiles';

export interface SysProfile {
  id: number;
  is_service: boolean;
  sys_url: string;
  sys_title: I18nField;
  sys_copyright: I18nField;
  sys_organization: number;
  sys_mana_email: string;
  sys_timezone: string;
  sys_languages: string[];
  edit_by: number;
  created_at: string;
  updated_at?: string;
}

export interface SysProfileUpdate {
  is_service?: boolean;
  sys_url?: string;
  sys_title?: I18nField;
  sys_copyright?: I18nField;
  sys_organization?: number;
  sys_mana_email?: string;
  sys_timezone?: string;
  sys_languages?: string[];
}

/**
 * 取得系統設定（後端會自動查詢 id=1）
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const getSysProfile = async (): Promise<SysProfile> => {
  const response = await axios.get<SysProfile>(`${BASE_URL}/`);
  return response.data;
};

/**
 * 更新系統設定（後端會自動更新 id=1）
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const updateSysProfile = async (data: SysProfileUpdate): Promise<SysProfile> => {
  const response = await axios.put<SysProfile>(`${BASE_URL}/`, data);
  return response.data;
};
