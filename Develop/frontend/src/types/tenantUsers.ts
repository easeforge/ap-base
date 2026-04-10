/**
 * 組織成員維護相關類型定義
 */

export interface TenantUser {
  id: number;
  organization_id: number;
  account: string; // Email 格式
  username: string;
  department?: string;
  job_title?: string;
  phone?: string;
  user_role: number[]; // 角色 ID 陣列
  last_login_at?: string;
  last_login_ip?: string;
  is_active: boolean;
  edit_by: number;
  created_at?: string;
  updated_at?: string;
}

export interface TenantUserCreate {
  organization_id: number;
  account: string;
  username: string;
  password: string;
  department?: string;
  job_title?: string;
  phone?: string;
  user_role: number[];
  is_active?: boolean;
}

export interface TenantUserUpdate {
  account?: string;
  username?: string;
  department?: string;
  job_title?: string;
  phone?: string;
  user_role?: number[];
  is_active?: boolean;
}

export interface PasswordReset {
  user_id: number;
}
