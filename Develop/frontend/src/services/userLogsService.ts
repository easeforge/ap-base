/**
 * 使用者日誌相關 API
 */

import axios from '../api/axios';

export interface UserLog {
  id: number;
  user_id: number;
  system_function_id: number;
  module_item: 'View' | 'Create' | 'Read' | 'Update' | 'Delete' | 'Print' | 'File' | 'Login';
  data_id?: number;
  session_id?: string;
  look_data: Record<string, any>;
  change_data: Record<string, any>;
  action_at: string;
  err_detail: string | null;
  user_name?: string;
  function_name?: string;
}

export interface UserLogCreate {
  system_function_id: number;
  module_item: 'View' | 'Create' | 'Read' | 'Update' | 'Delete' | 'Print' | 'File' | 'Login';
  data_id?: number;
  look_data?: Record<string, any>;
  change_data?: Record<string, any>;
  err_detail?: string | null;
}

export interface UserLogQueryParams {
  user_id?: number;
  system_function_id?: number;
  module_item?: string;
  data_id?: number;
  start_date?: string;
  end_date?: string;
  has_error?: boolean;
  skip?: number;
  limit?: number;
}

/**
 * 取得使用者日誌列表
 */
export const getUserLogs = async (params?: UserLogQueryParams): Promise<UserLog[]> => {
  const response = await axios.get('/api/user_logs/', { params });
  return response.data;
};

/**
 * 取得單筆日誌
 */
export const getUserLog = async (logId: number): Promise<UserLog> => {
  const response = await axios.get(`/api/user_logs/${logId}`);
  return response.data;
};

/**
 * 取得特定使用者的日誌
 */
export const getUserLogsByUser = async (userId: number, skip = 0, limit = 100): Promise<UserLog[]> => {
  const response = await axios.get(`/api/user_logs/user/${userId}`, {
    params: { skip, limit }
  });
  return response.data;
};

/**
 * 取得特定功能的日誌
 */
export const getUserLogsByFunction = async (functionId: number, skip = 0, limit = 100): Promise<UserLog[]> => {
  const response = await axios.get(`/api/user_logs/function/${functionId}`, {
    params: { skip, limit }
  });
  return response.data;
};

/**
 * 建立使用者日誌記錄
 * 由前端主動呼叫，記錄使用者操作行為
 */
export const createUserLog = async (log: UserLogCreate): Promise<UserLog> => {
  const response = await axios.post('/api/user_logs/log', log);
  return response.data;
};
