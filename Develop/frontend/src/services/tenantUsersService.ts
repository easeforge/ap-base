/**
 * 組織成員維護服務 (tenant_users)
 *
 * 使用便捷端點 /api/users/me/members
 * 自動使用當前使用者的組織 ID，不需要在呼叫時傳遞
 */

import axios from '../api/axios';
import { TenantUser, TenantUserCreate, TenantUserUpdate } from '../types/tenantUsers';

/**
 * 取得當前組織的成員列表
 *
 * 使用便捷端點: GET /api/users/me/members
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const getTenantUsers = async (params?: {
  skip?: number;
  limit?: number;
  is_active?: boolean;
  search?: string;
}): Promise<TenantUser[]> => {
  try {
    const response = await axios.get<TenantUser[]>('/api/users/me/members', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to get tenant users');
    throw error;
  }
};

/**
 * 取得單一組織成員資料
 *
 * 使用便捷端點: GET /api/users/me/members/{id}
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const getTenantUser = async (id: number): Promise<TenantUser> => {
  try {
    const response = await axios.get<TenantUser>(`/api/users/me/members/${id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to get tenant user');
    throw error;
  }
};

/**
 * 新增組織成員
 *
 * 使用便捷端點: POST /api/users/me/members
 * 不需要傳遞 organization_id，後端會自動使用當前使用者的組織
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const createTenantUser = async (data: TenantUserCreate): Promise<TenantUser> => {
  try {
    const response = await axios.post<TenantUser>('/api/users/me/members', data);
    return response.data;
  } catch (error) {
    console.error('Failed to create tenant user');
    throw error;
  }
};

/**
 * 更新組織成員資料
 *
 * 使用便捷端點: PUT /api/users/me/members/{id}
 * 只能更新自己組織的成員
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const updateTenantUser = async (id: number, data: TenantUserUpdate): Promise<TenantUser> => {
  try {
    const response = await axios.put<TenantUser>(`/api/users/me/members/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Failed to update tenant user');
    throw error;
  }
};

/**
 * 刪除組織成員（軟刪除）
 *
 * 使用便捷端點: DELETE /api/users/me/members/{id}
 * axios 攔截器會自動添加 X-Txn-Token header (one_time_use)
 */
export const deleteTenantUser = async (id: number): Promise<void> => {
  try {
    await axios.delete(`/api/users/me/members/${id}`);
  } catch (error) {
    console.error('Failed to delete tenant user');
    throw error;
  }
};

/**
 * 重設使用者密碼（發送郵件通知）
 */
export const resetUserPassword = async (userId: number): Promise<void> => {
  await axios.post(`/api/users/${userId}/reset-password`);
};

/**
 * 切換使用者啟用狀態
 */
export const toggleUserStatus = async (id: number, isActive: boolean): Promise<TenantUser> => {
  const response = await axios.put<TenantUser>(`/api/users/me/members/${id}`, { is_active: isActive });
  return response.data;
};

/**
 * 檢查帳號唯一性（用於編輯時驗證）
 */
export const checkAccountUniqueness = async (account: string, excludeId?: number): Promise<boolean> => {
  try {
    const users = await getTenantUsers();
    const existingUser = users.find(u => u.account === account && u.id !== excludeId);
    return !existingUser; // true = 唯一，false = 已存在
  } catch (error) {
    console.error('Failed to check account uniqueness');
    return false;
  }
};
