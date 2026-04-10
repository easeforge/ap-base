/**
 * 組織資料維護服務 (tenant_profile)
 *
 * 使用便捷端點 /api/organizations/me/profile
 * 自動使用當前使用者的組織 ID，不需要在呼叫時傳遞
 */

import axios from '../api/axios';
import { TenantProfile, TenantProfileUpdate } from '../types/tenantProfile';

/**
 * 取得當前使用者所屬組織資料
 *
 * 使用便捷端點: GET /api/organizations/me/profile
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const getMyTenantProfile = async (): Promise<TenantProfile> => {
  try {
    const response = await axios.get<TenantProfile>('/api/organizations/me/profile');
    return response.data;
  } catch (error) {
    console.error('[TenantProfileService] Failed to get my tenant profile:', error);
    throw error;
  }
};

/**
 * 更新組織資料
 *
 * 使用便捷端點: PUT /api/organizations/me/profile
 * 不需要傳遞組織 ID，自動更新當前使用者的組織
 * axios 攔截器會自動添加 X-Txn-Token header
 */
export const updateTenantProfile = async (
  data: TenantProfileUpdate
): Promise<TenantProfile> => {
  try {
    const response = await axios.put<TenantProfile>('/api/organizations/me/profile', data);
    return response.data;
  } catch (error) {
    console.error('[TenantProfileService] Failed to update tenant profile:', error);
    throw error;
  }
};
