/**
 * 使用者設定相關 API
 */

import axios from '../api/axios';

export interface UserDetail {
  id: number;
  organization_id: number;
  account: string;
  username: string;
  department?: string;
  job_title?: string;
  phone?: string;
  user_role: number[];
  last_login_at?: string;
  last_login_ip?: string;
  is_active: boolean;
  edit_by: number;
  created_at: string;
  updated_at?: string;
}

export interface UserDetailCreate {
  organization_id: number;
  account: string;
  username: string;
  password: string;
  department?: string;
  job_title?: string;
  phone?: string;
  user_role: number[];
  is_active: boolean;
}

export interface UserDetailUpdate {
  organization_id?: number;
  account?: string;
  username?: string;
  password?: string;
  department?: string;
  job_title?: string;
  phone?: string;
  user_role?: number[];
  is_active?: boolean;
}

export interface PasswordChange {
  old_password: string;
  new_password: string;
}

export interface GetUsersParams {
  skip?: number;
  limit?: number;
  is_active?: boolean;
  organization_id?: number;
  search?: string;
}

/**
 * 取得使用者列表
 */
export const getUsers = async (
  params?: GetUsersParams,
  txnToken?: string
): Promise<UserDetail[]> => {
  const config: any = { params };
  if (txnToken) {
    config.headers = { 'X-Txn-Token': txnToken };
  }
  const response = await axios.get('/api/users/', config);
  return response.data;
};

/**
 * 取得使用者資訊
 */
export const getUser = async (userId: number): Promise<UserDetail> => {
  const response = await axios.get(`/api/users/${userId}`);
  return response.data;
};

/**
 * 建立使用者
 */
export const createUser = async (data: UserDetailCreate): Promise<UserDetail> => {
  const response = await axios.post('/api/users/', data);
  return response.data;
};

/**
 * 更新使用者
 */
export const updateUser = async (userId: number, data: UserDetailUpdate): Promise<UserDetail> => {
  const response = await axios.put(`/api/users/${userId}`, data);
  return response.data;
};

/**
 * 刪除使用者
 */
export const deleteUser = async (userId: number): Promise<void> => {
  await axios.delete(`/api/users/${userId}`);
};

/**
 * 取得當前使用者的個人資料
 */
export const getMyProfile = async (): Promise<UserDetail> => {
  const response = await axios.get('/api/users/me');
  return response.data;
};

/**
 * 更新當前使用者的個人資料
 */
export const updateMyProfile = async (
  data: Partial<UserDetailUpdate>,
  txnToken: string
): Promise<UserDetail> => {
  const response = await axios.put('/api/users/me', data, {
    headers: {
      'X-Txn-Token': txnToken
    }
  });
  return response.data;
};

/**
 * 修改當前使用者的密碼
 */
export const changePassword = async (
  userId: number,
  data: PasswordChange,
  txnToken: string
): Promise<void> => {
  await axios.post(`/api/users/${userId}/change-password`, data, {
    headers: {
      'X-Txn-Token': txnToken
    }
  });
};
