/**
 * 系統功能設定相關 API
 */

import axios from '../api/axios';

export interface SysFunction {
  id: number;
  func_code: string;
  upper_func_id: number;
  func_cname: string;
  func_ename: string;
  func_type: number; // 1:節點, 2:功能
  func_order: number;
  func_icon?: string;
  module_code?: string;
  module_item: string[]; // ["Create", "Read", "Update", "Delete", "Print", "File"]
  description?: string;
  is_mana: boolean;
  is_active: boolean;
  edit_by: number;
  created_at: string;
  updated_at?: string;
}

export interface SysFunctionCreate {
  func_code: string;
  upper_func_id: number;
  func_cname: string;
  func_ename: string;
  func_type: number;
  func_order: number;
  func_icon?: string;
  module_code?: string;
  module_item: string[]; // ["Create", "Read", "Update", "Delete", "Print", "File"]
  description?: string;
  is_mana: boolean;
  is_active: boolean;
}

export interface SysFunctionUpdate {
  func_code?: string;
  upper_func_id?: number;
  func_cname?: string;
  func_ename?: string;
  func_type?: number;
  func_order?: number;
  func_icon?: string;
  module_code?: string;
  module_item?: any[];
  description?: string;
  is_mana?: boolean;
  is_active?: boolean;
}

export interface GetFunctionsParams {
  skip?: number;
  limit?: number;
  is_active?: boolean;
  func_type?: number;
  search?: string;
}

/**
 * 取得系統功能列表
 */
export const getSysFunctions = async (params?: GetFunctionsParams): Promise<SysFunction[]> => {
  const response = await axios.get('/api/system_functions/', { params });
  return response.data;
};

/**
 * 取得系統功能資訊
 */
export const getSysFunction = async (functionId: number): Promise<SysFunction> => {
  const response = await axios.get(`/api/system_functions/${functionId}`);
  return response.data;
};

/**
 * 建立系統功能
 */
export const createSysFunction = async (data: SysFunctionCreate): Promise<SysFunction> => {
  const response = await axios.post('/api/system_functions/', data);
  return response.data;
};

/**
 * 更新系統功能
 */
export const updateSysFunction = async (functionId: number, data: SysFunctionUpdate): Promise<SysFunction> => {
  const response = await axios.put(`/api/system_functions/${functionId}`, data);
  return response.data;
};

/**
 * 刪除系統功能
 */
export const deleteSysFunction = async (functionId: number): Promise<void> => {
  await axios.delete(`/api/system_functions/${functionId}`);
};
