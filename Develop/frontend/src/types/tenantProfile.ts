/**
 * 組織資料維護相關類型定義
 */

export interface TenantProfile {
  id: number;
  org_code: string;
  org_name: string;
  org_type: number; // 1:政府機關，2:公司行號，3:個人
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  address?: string;
  phone?: string;
  is_mana: boolean;
  is_active: boolean;
  memo?: string;
  edit_by: number;
  created_at?: string;
  updated_at?: string;
}

export interface TenantProfileCreate {
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

export interface TenantProfileUpdate {
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
