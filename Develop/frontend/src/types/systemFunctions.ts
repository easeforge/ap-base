/**
 * System Functions Types
 * 系統功能設定相關類型定義（正名化版本）
 */

export interface SystemFunction {
  id: number;
  func_code: string;
  upper_func_id: number;
  func_cname: string;
  func_ename: string;
  func_type: number; // 1:節點/選單, 2:功能
  func_order: number;
  func_icon?: string;
  module_code?: string; // 正名化欄位（原 func_module_name）
  module_item: string[];
  description?: string;
  is_mana: boolean;
  is_active: boolean;
  edit_by: number;
  created_at: string;
  updated_at?: string;
  children?: SystemFunction[]; // 樹狀結構用
}

export interface SystemFunctionCreate {
  func_code: string;
  upper_func_id: number;
  func_cname: string;
  func_ename: string;
  func_type: number;
  func_order: number;
  func_icon?: string;
  module_code?: string; // 正名化欄位
  module_item?: string[];
  description?: string;
  is_mana?: boolean;
  is_active?: boolean;
}

export interface SystemFunctionUpdate {
  func_code?: string;
  upper_func_id?: number;
  func_cname?: string;
  func_ename?: string;
  func_type?: number;
  func_order?: number;
  func_icon?: string;
  module_code?: string; // 正名化欄位
  module_item?: string[];
  description?: string;
  is_mana?: boolean;
  is_active?: boolean;
}

export interface GetSystemFunctionsParams {
  skip?: number;
  limit?: number;
  is_active?: boolean;
  func_type?: number;
  search?: string;
}
