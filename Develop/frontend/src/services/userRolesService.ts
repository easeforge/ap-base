/**
 * 使用者角色相關 API
 */

import axios from '../api/axios';

export interface UserRole {
  id: number;
  role_cname: string;
  role_ename: string;
  description?: string;
  is_mana: boolean;
  is_active: boolean;
  edit_by: number;
  created_at: string;
  updated_at?: string;
}

export interface UserRoleCreate {
  role_cname: string;
  role_ename: string;
  description?: string;
  is_mana: boolean;
  is_active: boolean;
}

export interface UserRoleUpdate {
  role_cname?: string;
  role_ename?: string;
  description?: string;
  is_mana?: boolean;
  is_active?: boolean;
}

export interface GetUserRolesParams {
  skip?: number;
  limit?: number;
  is_active?: boolean;
  search?: string;
}

/**
 * 取得使用者角色列表
 */
export const getUserRoles = async (params?: GetUserRolesParams): Promise<UserRole[]> => {
  const response = await axios.get('/api/user_roles/', { params });
  return response.data;
};

/**
 * 取得使用者角色資訊
 */
export const getUserRole = async (roleId: number): Promise<UserRole> => {
  const response = await axios.get(`/api/user_role/${roleId}`);
  return response.data;
};

/**
 * 建立使用者角色
 */
export const createUserRole = async (data: UserRoleCreate): Promise<UserRole> => {
  const response = await axios.post('/api/user_roles/', data);
  return response.data;
};

/**
 * 更新使用者角色
 */
export const updateUserRole = async (roleId: number, data: UserRoleUpdate): Promise<UserRole> => {
  const response = await axios.put(`/api/user_role/${roleId}`, data);
  return response.data;
};

/**
 * 刪除使用者角色
 */
export const deleteUserRole = async (roleId: number): Promise<void> => {
  await axios.delete(`/api/user_role/${roleId}`);
};
