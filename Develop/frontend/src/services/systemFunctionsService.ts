/**
 * System Functions Service
 * 系統功能設定相關 API（正名化版本）
 */

import axios from '../api/axios';
import {
  SystemFunction,
  SystemFunctionCreate,
  SystemFunctionUpdate,
  GetSystemFunctionsParams
} from '../types/systemFunctions';

// Re-export types for convenience
export type {
  SystemFunction,
  SystemFunctionCreate,
  SystemFunctionUpdate,
  GetSystemFunctionsParams
};

/**
 * 取得系統功能列表
 */
export const getSystemFunctions = async (params?: GetSystemFunctionsParams): Promise<SystemFunction[]> => {
  const response = await axios.get('/api/system_functions/', { params });
  return response.data;
};

/**
 * 取得系統功能樹狀結構
 */
export const getSystemFunctionsTree = async (params?: { is_active?: boolean }): Promise<SystemFunction[]> => {
  const response = await axios.get('/api/system_functions/tree', { params });
  return response.data;
};

/**
 * 取得單一系統功能
 */
export const getSystemFunction = async (functionId: number): Promise<SystemFunction> => {
  const response = await axios.get(`/api/system_functions/${functionId}`);
  return response.data;
};

/**
 * 建立系統功能
 */
export const createSystemFunction = async (data: SystemFunctionCreate): Promise<SystemFunction> => {
  const response = await axios.post('/api/system_functions/', data);
  return response.data;
};

/**
 * 更新系統功能
 */
export const updateSystemFunction = async (
  functionId: number,
  data: SystemFunctionUpdate
): Promise<SystemFunction> => {
  const response = await axios.put(`/api/system_functions/${functionId}`, data);
  return response.data;
};

/**
 * 刪除系統功能
 */
export const deleteSystemFunction = async (functionId: number): Promise<void> => {
  await axios.delete(`/api/system_functions/${functionId}`);
};
