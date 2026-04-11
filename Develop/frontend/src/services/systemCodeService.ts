/**
 * 系統代碼服務
 *
 * 注意: axios 攔截器會自動從 localStorage 讀取 txn_token 並添加到所有請求的 header
 * Service 層不需要手動傳遞 txn_token 參數
 */

import axios from '../api/axios';
import { I18nField } from '../types';

const BASE_URL = '/api/system_codes';

export interface SystemCode {
  id: number;
  code_type: string;
  code_type_name: I18nField;
  code: string;
  code_name: I18nField;
  order: number;
  is_active: boolean;
  note1?: string;
  note2?: string;
  note3?: string;
  note4?: string;
  note5?: string;
  edit_by: number;
  created_at: string;
  updated_at: string;
}

export interface SystemCodeCreate {
  code_type: string;
  code_type_name: I18nField;
  code: string;
  code_name: I18nField;
  order?: number;
  is_active?: boolean;
  note1?: string;
  note2?: string;
  note3?: string;
  note4?: string;
  note5?: string;
}

export interface SystemCodeUpdate {
  code_type?: string;
  code_type_name?: I18nField;
  code?: string;
  code_name?: I18nField;
  order?: number;
  is_active?: boolean;
  note1?: string;
  note2?: string;
  note3?: string;
  note4?: string;
  note5?: string;
}

/**
 * 取得系統代碼列表
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const getSystemCodes = async (params?: {
  code_type?: string;
  code?: string;
  is_active?: boolean;
  search?: string;
}): Promise<SystemCode[]> => {
  const response = await axios.get<SystemCode[]>(`${BASE_URL}/`, { params });
  return response.data;
};

/**
 * 取得系統代碼資訊
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const getSystemCode = async (codeId: number): Promise<SystemCode> => {
  const response = await axios.get<SystemCode>(`${BASE_URL}/${codeId}`);
  return response.data;
};

/**
 * 建立系統代碼
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const createSystemCode = async (data: SystemCodeCreate): Promise<SystemCode> => {
  const response = await axios.post<SystemCode>(`${BASE_URL}/`, data);
  return response.data;
};

/**
 * 更新系統代碼
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const updateSystemCode = async (
  codeId: number,
  data: SystemCodeUpdate
): Promise<SystemCode> => {
  const response = await axios.put<SystemCode>(`${BASE_URL}/${codeId}`, data);
  return response.data;
};

/**
 * 刪除系統代碼
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const deleteSystemCode = async (codeId: number): Promise<void> => {
  await axios.delete(`${BASE_URL}/${codeId}`);
};

/**
 * 根據代碼類別查詢
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const getSystemCodesByType = async (
  codeType: string,
  activeOnly: boolean = true
): Promise<SystemCode[]> => {
  const params = new URLSearchParams({ active_only: String(activeOnly) });
  const response = await axios.get<SystemCode[]>(`${BASE_URL}/type/${codeType}?${params.toString()}`);
  return response.data;
};
