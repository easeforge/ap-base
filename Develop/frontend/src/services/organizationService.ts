/**
 * 組織單位服務
 *
 * 注意: axios 攔截器會自動從 localStorage 讀取 txn_token 並添加到所有請求的 header
 * Service 層不需要手動傳遞 txn_token 參數
 */

import axios from '../api/axios';

const BASE_URL = '/api/organizations';

export interface Organization {
  id: number;
  org_code: string;
  org_name: string;
  org_type: number;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  address?: string;
  phone?: string;
  is_mana: boolean;
  is_active: boolean;
  memo?: string;
  edit_by: number;
  created_at: string;
  updated_at?: string;
}

export interface OrganizationCreate {
  org_code: string;
  org_name: string;
  org_type: number;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  address?: string;
  phone?: string;
  is_mana?: boolean;
  is_active?: boolean;
  memo?: string;
}

export interface OrganizationUpdate {
  org_code?: string;
  org_name?: string;
  org_type?: number;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  phone?: string;
  is_mana?: boolean;
  is_active?: boolean;
  memo?: string;
}

/**
 * 取得組織單位列表
 */
export const getOrganizations = async (params?: {
  skip?: number;
  limit?: number;
  is_active?: boolean;
  search?: string;
}): Promise<Organization[]> => {
  const response = await axios.get<Organization[]>(`${BASE_URL}/`, { params });
  return response.data;
};

/**
 * 取得組織單位資訊
 */
export const getOrganization = async (organizationId: number): Promise<Organization> => {
  const response = await axios.get<Organization>(`${BASE_URL}/${organizationId}`);
  return response.data;
};

/**
 * 建立組織單位
 */
export const createOrganization = async (data: OrganizationCreate): Promise<Organization> => {
  const response = await axios.post<Organization>(`${BASE_URL}/`, data);
  return response.data;
};

/**
 * 更新組織單位
 */
export const updateOrganization = async (
  organizationId: number,
  data: OrganizationUpdate
): Promise<Organization> => {
  const response = await axios.put<Organization>(`${BASE_URL}/${organizationId}`, data);
  return response.data;
};

/**
 * 刪除組織單位
 */
export const deleteOrganization = async (organizationId: number): Promise<void> => {
  await axios.delete(`${BASE_URL}/${organizationId}`);
};
