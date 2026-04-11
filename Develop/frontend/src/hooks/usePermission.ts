/**
 * Permission Hook
 * 權限檢查 Hook
 */

import { useState, useEffect } from 'react';
import { getUserPermissions, UserPermissions } from '../services/permissionService';

/**
 * 使用權限檢查 Hook
 * @returns 權限物件和檢查函數
 */
export const usePermission = () => {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const data = await getUserPermissions();
      setPermissions(data);
    } catch (error) {
      console.error('[usePermission] 載入權限失敗:', error);
      setPermissions(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 檢查是否有特定功能的特定權限
   * @param funcCode 功能代碼
   * @param permissionType 權限類型
   * @returns 是否有權限
   */
  const hasPermission = (funcCode: string, permissionType: 'create' | 'read' | 'update' | 'delete' | 'print' | 'file'): boolean => {
    if (!permissions || !permissions[funcCode]) {
      return false;
    }

    const permission = permissions[funcCode];
    const key = `is_${permissionType}` as keyof typeof permission;
    return permission[key] || false;
  };

  return {
    permissions,
    loading,
    hasPermission,
    reload: loadPermissions
  };
};
