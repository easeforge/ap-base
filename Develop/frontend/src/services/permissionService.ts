/**
 * Permission Service
 * 權限檢查 API 服務
 */

import axios from '../api/axios';

// 權限介面
export interface Permission {
  is_create: boolean;
  is_read: boolean;
  is_update: boolean;
  is_delete: boolean;
  is_print: boolean;
  is_file: boolean;
}

// 使用者權限物件 (key 為 func_code)
export interface UserPermissions {
  [funcCode: string]: Permission;
}

/**
 * 取得當前使用者的所有權限
 */
export const getUserPermissions = async (): Promise<UserPermissions> => {
  const response = await axios.get('/api/permissions/me');
  return response.data;
};
