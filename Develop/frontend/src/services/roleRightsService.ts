/**
 * Role Right Service
 * 角色權限設定 API 服務
 */

import axios from '../api/axios';

// 類型定義
export interface RoleRight {
  id?: number;
  system_function_id: number;
  func_code: string;
  is_create: boolean;
  is_read: boolean;
  is_update: boolean;
  is_delete: boolean;
  is_print: boolean;
  is_file: boolean;
}

export interface FunctionWithPermissions {
  id: number;
  func_code: string;
  func_cname: string;
  func_ename: string;
  func_type: number;
  func_order: number;
  upper_func_id: number;
  module_item: string[];
  available_permissions: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
    print: boolean;
    file: boolean;
  };
}

export interface RoleRightsDetail {
  role_id: number;
  role_name: string;
  rights: RoleRight[];
}

/**
 * 取得功能清單與可用權限
 * @param roleId 角色ID (可選) - 若提供且角色為非系統管理角色,將過濾掉系統管理功能
 */
export const getFunctionsWithPermissions = async (roleId?: number): Promise<FunctionWithPermissions[]> => {
  const config = roleId ? { params: { role_id: roleId } } : {};
  const response = await axios.get('/api/role_rights/functions', config);
  return response.data;
};

/**
 * 取得角色權限設定
 */
export const getRoleRights = async (roleId: number): Promise<RoleRightsDetail> => {
  const response = await axios.get(`/api/role_rights/${roleId}`);
  return response.data;
};

/**
 * 儲存角色權限設定
 */
export const saveRoleRights = async (roleId: number, rights: RoleRight[]): Promise<any> => {
  const response = await axios.post(`/api/role_rights/${roleId}`, { rights });
  return response.data;
};

/**
 * 刪除角色權限設定
 */
export const deleteRoleRights = async (roleId: number): Promise<any> => {
  const response = await axios.delete(`/api/role_rights/${roleId}`);
  return response.data;
};
