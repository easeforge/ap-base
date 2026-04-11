/**
 * Role Rights Page
 * 角色權限設定作業頁面
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getFunctionsWithPermissions,
  getRoleRights,
  saveRoleRights,
  FunctionWithPermissions,
  RoleRight
} from '../services/roleRightsService';
import { getUserRoles, UserRole } from '../services/userRoleService';
import { usePermission } from '../hooks/usePermission';
import FunctionPageHeader from '../components/FunctionPageHeader';
import { logView, logUpdate } from '../utils/userLogHelper';
import { validateSession } from '../utils/sessionValidator';
import { getI18nValue } from '../utils/i18nHelper';
import '../styles/RoleRightsPage.css';

const RoleRightsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission, loading: permissionLoading } = usePermission();

  // 狀態管理
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [functions, setFunctions] = useState<FunctionWithPermissions[]>([]);
  const [rights, setRights] = useState<Map<number, RoleRight>>(new Map());
  const [originalRights, setOriginalRights] = useState<Map<number, RoleRight>>(new Map());
  const [loading, setLoading] = useState(false);
  const hasLoadedRef = useRef(false);
  const hasInitialized = useRef(false);

  // 檢查使用者對 role_rights 的權限
  const canUpdate = hasPermission('role_rights', 'update');

  // 載入角色清單
  useEffect(() => {
    // 使用 ref 避免 StrictMode 重複執行
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      const initPage = async () => {
        try {
          // 載入角色清單
          await loadRoles();

          // 檢查 URL 參數中是否有 role_id (重新整理時恢復狀態)
          const urlParams = new URLSearchParams(window.location.search);
          const roleIdParam = urlParams.get('role_id');

          if (roleIdParam) {
            const roleId = parseInt(roleIdParam, 10);
            if (!isNaN(roleId)) {
              // 重新整理時，自動載入該角色的權限資料
              await handleRoleChange(roleId);
            }
          }

          if (!hasInitialized.current) {
            hasInitialized.current = true;
            await logView('role_rights', {}, null);
          }
        } catch (err: any) {
          const errorMsg = err.response?.data?.detail || err.message || t('message.loadFailed');
          await logView('role_rights', {}, errorMsg);
        }
      };
      initPage();
    }
  }, []);

  // 載入角色清單
  const loadRoles = async () => {
    try {
      const data = await getUserRoles({ is_active: true });
      setRoles(data);
    } catch (error) {
      console.error('[RoleRightsPage] Failed to load roles:', error);
    }
  };

  // 載入功能清單
  const loadFunctions = async (roleId?: number) => {
    try {
      const data = await getFunctionsWithPermissions(roleId);
      setFunctions(data);
    } catch (error) {
      console.error('[RoleRightsPage] Failed to load functions:', error);
    }
  };

  // 角色選擇變更
  const handleRoleChange = async (roleId: number | null) => {
    // 如果選擇空值,清空所有狀態
    if (!roleId || roleId === 0) {
      setSelectedRoleId(null);
      setRights(new Map());
      setOriginalRights(new Map());
      // 清除 URL 參數
      window.history.pushState({}, '', window.location.pathname);
      return;
    }

    setSelectedRoleId(roleId);
    setLoading(true);

    // 將選擇的角色 ID 寫入 URL 參數 (重新整理時可以恢復)
    const url = new URL(window.location.href);
    url.searchParams.set('role_id', roleId.toString());
    window.history.pushState({}, '', url.toString());

    try {
      // 驗證 session 有效性（檢查 token 並與後端驗證）
      const isValid = await validateSession('RoleRightsPage');
      if (!isValid) {
        return; // validateSession 會自動導向登入頁
      }

      // 根據選擇的角色重新載入功能清單（axios 攔截器會自動帶入 token）
      await loadFunctions(roleId);

      const data = await getRoleRights(roleId);

      // 將權限資料轉為 Map
      const rightsMap = new Map<number, RoleRight>();
      data.rights.forEach(right => {
        rightsMap.set(right.system_function_id, right);
      });

      // 初始化所有功能的權限 (未設定的功能預設全為 false)
      functions.forEach(func => {
        // 功能id 1~5 為必要功能，權限依照module_item設定
        const isRequiredFunc = func.id >= 1 && func.id <= 5;

        if (!rightsMap.has(func.id)) {
          const newRight: RoleRight = {
            system_function_id: func.id,
            func_code: func.func_code,
            is_create: isRequiredFunc ? func.available_permissions.create : false,
            is_read: isRequiredFunc ? func.available_permissions.read : false,
            is_update: isRequiredFunc ? func.available_permissions.update : false,
            is_delete: isRequiredFunc ? func.available_permissions.delete : false,
            is_print: isRequiredFunc ? func.available_permissions.print : false,
            is_file: isRequiredFunc ? func.available_permissions.file : false
          };
          rightsMap.set(func.id, newRight);
        } else {
          // 如果已有權限設定,確保必要功能(id 1~5)的權限符合module_item設定
          const existingRight = rightsMap.get(func.id)!;
          if (isRequiredFunc) {
            existingRight.is_create = func.available_permissions.create;
            existingRight.is_read = func.available_permissions.read;
            existingRight.is_update = func.available_permissions.update;
            existingRight.is_delete = func.available_permissions.delete;
            existingRight.is_print = func.available_permissions.print;
            existingRight.is_file = func.available_permissions.file;
            rightsMap.set(func.id, existingRight);
          }
        }
      });

      setRights(rightsMap);
      setOriginalRights(new Map(rightsMap));
    } catch (error) {
      console.error('[RoleRightsPage] Failed to load role rights:', error);
    } finally {
      setLoading(false);
    }
  };

  // 權限勾選變更
  const handlePermissionChange = (
    funcId: number,
    funcCode: string,
    permission: keyof Omit<RoleRight, 'system_function_id' | 'func_code' | 'id'>,
    value: boolean
  ) => {
    // 功能id 1~5 為必要功能，權限不可更改
    if (funcId >= 1 && funcId <= 5) {
      return;
    }

    const newRights = new Map(rights);
    const right: RoleRight = newRights.get(funcId) || {
      system_function_id: funcId,
      func_code: funcCode,
      is_create: false,
      is_read: false,
      is_update: false,
      is_delete: false,
      is_print: false,
      is_file: false
    };

    right[permission] = value;
    newRights.set(funcId, right);
    setRights(newRights);
  };

  // 儲存權限設定
  const handleSave = async () => {
    if (!selectedRoleId) {
      alert(t('roleRight.pleaseSelectRole'));
      return;
    }

    // 檢查是否有修改權限
    if (!canUpdate) {
      alert(t('common.noUpdatePermission') || '您只有讀取權限，無法修改');
      return;
    }

    // 準備舊資料和新資料用於日誌記錄
    const oldData = {
      role_id: selectedRoleId,
      permissions: Array.from(originalRights.values())
    };
    const newData = {
      role_id: selectedRoleId,
      permissions: Array.from(rights.values())
    };

    try {
      setLoading(true);

      // 驗證 session 有效性（檢查 token 並與後端驗證）
      const isValid = await validateSession('RoleRightsPage');
      if (!isValid) {
        return; // validateSession 會自動導向登入頁
      }

      // 將 Map 轉為陣列
      const rightsArray = Array.from(rights.values());

      // 儲存權限（axios 攔截器會自動從 localStorage 讀取 txn_token 並添加到 header）
      await saveRoleRights(selectedRoleId, rightsArray);

      // 前端獨立記錄日誌（使用獨立的 API 請求）
      try {
        await logUpdate('role_rights', oldData, newData);
      } catch (logErr) {
        console.error('[RoleRightsPage] Failed to log success:', logErr);
        // 日誌失敗不影響主要功能
      }

      // 重新載入功能列表，以顯示最新的功能
      await loadFunctions(selectedRoleId);

      alert(t('roleRight.saveSuccess'));

      // 更新原始資料為新資料
      setOriginalRights(new Map(rights));
    } catch (error: any) {

      const errorMsg = error.response?.data?.detail || t('common.error');

      // 記錄錯誤日誌
      try {
        await logUpdate('role_rights', oldData, newData, errorMsg);
      } catch (logErr) {
        console.error('[RoleRightsPage] Failed to log error:', logErr);
      }

      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 取得節點下所有子孫功能（遞迴）
  const getDescendantFunctions = (parentId: number): FunctionWithPermissions[] => {
    const children = functions.filter(f => f.upper_func_id === parentId);
    let descendants: FunctionWithPermissions[] = [];
    children.forEach(child => {
      if (child.func_type === 2) {
        descendants.push(child);
      }
      descendants = descendants.concat(getDescendantFunctions(child.id));
    });
    return descendants;
  };

  // 節點全選：將該節點下所有子功能的可用權限設為 true
  const handleNodeSelectAll = (nodeId: number) => {
    const descendants = getDescendantFunctions(nodeId);
    const newRights = new Map(rights);
    descendants.forEach(func => {
      if (func.id >= 1 && func.id <= 5) return; // 必要功能不動
      const right: RoleRight = newRights.get(func.id) || {
        system_function_id: func.id,
        func_code: func.func_code,
        is_create: false, is_read: false, is_update: false,
        is_delete: false, is_print: false, is_file: false
      };
      if (func.available_permissions.create) right.is_create = true;
      if (func.available_permissions.read) right.is_read = true;
      if (func.available_permissions.update) right.is_update = true;
      if (func.available_permissions.delete) right.is_delete = true;
      if (func.available_permissions.print) right.is_print = true;
      if (func.available_permissions.file) right.is_file = true;
      newRights.set(func.id, right);
    });
    setRights(newRights);
  };

  // 節點全刪：將該節點下所有子功能的權限設為 false
  const handleNodeDeselectAll = (nodeId: number) => {
    const descendants = getDescendantFunctions(nodeId);
    const newRights = new Map(rights);
    descendants.forEach(func => {
      if (func.id >= 1 && func.id <= 5) return; // 必要功能不動
      const right: RoleRight = newRights.get(func.id) || {
        system_function_id: func.id,
        func_code: func.func_code,
        is_create: false, is_read: false, is_update: false,
        is_delete: false, is_print: false, is_file: false
      };
      right.is_create = false;
      right.is_read = false;
      right.is_update = false;
      right.is_delete = false;
      right.is_print = false;
      right.is_file = false;
      newRights.set(func.id, right);
    });
    setRights(newRights);
  };

  // 渲染功能樹狀結構
  const renderFunctionTree = () => {
    // 建立樹狀結構
    const tree: { [key: number]: FunctionWithPermissions[] } = {};
    functions.forEach(func => {
      if (!tree[func.upper_func_id]) {
        tree[func.upper_func_id] = [];
      }
      tree[func.upper_func_id].push(func);
    });

    // 遞迴渲染
    const renderNode = (parentId: number, level: number = 0): React.ReactElement[] => {
      const children = tree[parentId] || [];
      return children.map(func => {
        const right = rights.get(func.id);
        const indent = '　'.repeat(level);

        const isRequiredFunc = func.id >= 1 && func.id <= 5;
        const funcName = getI18nValue(func.func_name, i18n.language);
        const nodeLabel = i18n.language === 'zh-TW' ? '(節點)' : '(Node)';

        return (
          <React.Fragment key={func.id}>
            <tr className={func.func_type === 1 ? 'node-row' : ''}>
              <td className="func-name">
                {indent}
                {func.func_type === 1 ? '└ ' : '├ '}
                {funcName}
                {func.func_type === 1 && ` ${nodeLabel}`}
                {func.func_type === 1 && canUpdate && selectedRoleId && (
                  <span className="node-actions">
                    <button
                      className="btn-node-select"
                      onClick={() => handleNodeSelectAll(func.id)}
                      title={i18n.language === 'zh-TW' ? '全選此節點下所有權限' : 'Select all permissions under this node'}
                    >
                      {i18n.language === 'zh-TW' ? '全選' : 'All'}
                    </button>
                    <button
                      className="btn-node-deselect"
                      onClick={() => handleNodeDeselectAll(func.id)}
                      title={i18n.language === 'zh-TW' ? '清除此節點下所有權限' : 'Clear all permissions under this node'}
                    >
                      {i18n.language === 'zh-TW' ? '全刪' : 'None'}
                    </button>
                  </span>
                )}
              </td>

              {/* 新增權限 */}
              <td className="permission-cell">
                <input
                  type="checkbox"
                  checked={right?.is_create || false}
                  disabled={!canUpdate || isRequiredFunc || !func.available_permissions.create || !selectedRoleId}
                  onChange={(e) => handlePermissionChange(
                    func.id,
                    func.func_code,
                    'is_create',
                    e.target.checked
                  )}
                  title={!canUpdate ? '無修改權限' : isRequiredFunc ? '必要功能，不可修改' : ''}
                />
              </td>

              {/* 讀取權限 */}
              <td className="permission-cell">
                <input
                  type="checkbox"
                  checked={right?.is_read || false}
                  disabled={!canUpdate || isRequiredFunc || !func.available_permissions.read || !selectedRoleId}
                  onChange={(e) => handlePermissionChange(
                    func.id,
                    func.func_code,
                    'is_read',
                    e.target.checked
                  )}
                  title={!canUpdate ? '無修改權限' : isRequiredFunc ? '必要功能，不可修改' : ''}
                />
              </td>

              {/* 修改權限 */}
              <td className="permission-cell">
                <input
                  type="checkbox"
                  checked={right?.is_update || false}
                  disabled={!canUpdate || isRequiredFunc || !func.available_permissions.update || !selectedRoleId}
                  onChange={(e) => handlePermissionChange(
                    func.id,
                    func.func_code,
                    'is_update',
                    e.target.checked
                  )}
                  title={!canUpdate ? '無修改權限' : isRequiredFunc ? '必要功能，不可修改' : ''}
                />
              </td>

              {/* 刪除權限 */}
              <td className="permission-cell">
                <input
                  type="checkbox"
                  checked={right?.is_delete || false}
                  disabled={!canUpdate || isRequiredFunc || !func.available_permissions.delete || !selectedRoleId}
                  onChange={(e) => handlePermissionChange(
                    func.id,
                    func.func_code,
                    'is_delete',
                    e.target.checked
                  )}
                  title={!canUpdate ? '無修改權限' : isRequiredFunc ? '必要功能，不可修改' : ''}
                />
              </td>

              {/* 列印權限 */}
              <td className="permission-cell">
                <input
                  type="checkbox"
                  checked={right?.is_print || false}
                  disabled={!canUpdate || isRequiredFunc || !func.available_permissions.print || !selectedRoleId}
                  onChange={(e) => handlePermissionChange(
                    func.id,
                    func.func_code,
                    'is_print',
                    e.target.checked
                  )}
                  title={!canUpdate ? '無修改權限' : isRequiredFunc ? '必要功能，不可修改' : ''}
                />
              </td>

              {/* 產檔權限 */}
              <td className="permission-cell">
                <input
                  type="checkbox"
                  checked={right?.is_file || false}
                  disabled={!canUpdate || isRequiredFunc || !func.available_permissions.file || !selectedRoleId}
                  onChange={(e) => handlePermissionChange(
                    func.id,
                    func.func_code,
                    'is_file',
                    e.target.checked
                  )}
                  title={!canUpdate ? '無修改權限' : isRequiredFunc ? '必要功能，不可修改' : ''}
                />
              </td>
            </tr>

            {/* 遞迴渲染子功能 */}
            {renderNode(func.id, level + 1)}
          </React.Fragment>
        );
      });
    };

    return renderNode(0);
  };

  return (
    <div className="role-right-page">
      <FunctionPageHeader funcCode="role_rights" />

      {/* 角色選擇 */}
      <div className="role-selector">
        <label>{t('roleRight.selectRole')}: </label>
        <select
          value={selectedRoleId || ''}
          onChange={(e) => handleRoleChange(e.target.value ? Number(e.target.value) : null)}
          disabled={loading}
        >
          <option value="">{t('roleRight.pleaseSelectRole')}</option>
          {roles.map(role => (
            <option key={role.id} value={role.id}>
              {getI18nValue(role.role_name, i18n.language)}
            </option>
          ))}
        </select>
      </div>

      {/* 權限設定表格 */}
      {selectedRoleId && (
        <div className="permissions-table-container">
          <table className="permissions-table">
            <thead className="table-header-dark-green">
              <tr>
                <th>{t('roleRight.functionName')}</th>
                <th>{t('roleRight.create')}</th>
                <th>{t('roleRight.read')}</th>
                <th>{t('roleRight.update')}</th>
                <th>{t('roleRight.delete')}</th>
                <th>{t('roleRight.print')}</th>
                <th>{t('roleRight.file')}</th>
              </tr>
            </thead>
            <tbody>
              {renderFunctionTree()}
            </tbody>
          </table>
        </div>
      )}

      {/* 操作按鈕 */}
      {selectedRoleId && (
        <div className="action-buttons">
          <button onClick={handleSave} disabled={!canUpdate || loading}>
            {loading ? t('common.saving') : t('common.save')}
          </button>
          {!canUpdate && (
            <p className="permission-warning" style={{ color: 'red', marginTop: '10px' }}>
              {t('common.noUpdatePermission') || '您只有讀取權限，無法修改'}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default RoleRightsPage;
