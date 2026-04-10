/**
 * 系統類型定義
 */

// 系統設定
export interface SystemProfile {
  id: number;
  is_service: boolean;
  sys_url: string;
  sys_ctitle: string;
  sys_etitle: string;
  sys_ccopyright: string;
  sys_ecopyright: string;
  sys_organization: number;
  sys_mana_email: string;
}

// 系統檢查回應
export interface SystemCheckResponse {
  status: string;
  message: string;
  is_service: boolean;
}

// 登入請求
export interface LoginRequest {
  account: string;
  password: string;
  captcha_key: string;
  captcha_code: string;
}

// Token 回應
export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// 使用者資料
export interface UserProfile {
  id: number;
  account: string;
  username: string;
  organization_id: number;
  department: string | null;
  job_title: string | null;
  phone: string | null;
  user_role: number[];
}

// 系統功能模組
export interface SystemFunction {
  id: number;
  func_code: string;
  func_cname: string;
  func_ename: string;
  func_type: number;  // 1:節點, 2:功能
  func_order: number;
  func_icon: string | null;
  module_code: string | null;        // 模組代碼（正名化）
  module_item: any[];
  upper_func_id: number;
  description?: string;              // 功能說明
  is_mana: boolean;
  is_active: boolean;
  children?: SystemFunction[];
}

// 模組項目
export interface ModuleItem {
  name: string;
  path: string;
  component: string;
}

// API 錯誤回應
export interface ApiError {
  detail: string;
}
