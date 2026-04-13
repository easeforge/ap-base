/**
 * 組織成員維護頁面
 * Tenant Users Page
 *
 * 功能說明：
 * 1. 讀取權限：檢視組織成員列表（唯讀模式）
 * 2. 新增權限：新增組織成員（含密碼確認）
 * 3. 修改權限：修改成員資料（帳號可修改但需檢查唯一性）
 * 4. 刪除權限：刪除組織成員（含確認對話框）
 * 5. 重設密碼：發送密碼重設郵件
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TenantUser, TenantUserCreate, TenantUserUpdate } from '../types/tenantUsers';
import {
  getTenantUsers,
  createTenantUser,
  updateTenantUser,
  deleteTenantUser,
  resetUserPassword,
  toggleUserStatus,
  checkAccountUniqueness
} from '../services/tenantUsersService';
import { getUserRoles, UserRole } from '../services/userRoleService';
import { getMyTenantProfile } from '../services/tenantProfileService';
import { useAuth } from '../contexts/AuthContext';
import { usePermission } from '../hooks/usePermission';
import { useFunctionName } from '../hooks/useFunctionName';
import { logView, logCreate, logUpdate, logDelete } from '../utils/userLogHelper';
import FunctionPageHeader from '../components/FunctionPageHeader';
import { validateSession } from '../utils/sessionValidator';
import { getI18nValue } from '../utils/i18nHelper';
import '../styles/DataTable.css';

const TenantUsersPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { hasPermission, loading: permissionLoading } = usePermission();
  const pageTitle = useFunctionName('tenant_users');
  const hasInitialized = useRef(false);

  const [users, setUsers] = useState<TenantUser[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isManaOrg, setIsManaOrg] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<TenantUser | null>(null);

  // Form states
  const [createForm, setCreateForm] = useState<TenantUserCreate & { confirmPassword: string }>({
    organization_id: user?.organization_id || 0,
    account: '',
    username: '',
    password: '',
    confirmPassword: '',
    department: '',
    job_title: '',
    phone: '',
    user_role: [],
    is_active: true
  });

  const [editForm, setEditForm] = useState<TenantUserUpdate>({
    account: '',
    username: '',
    department: '',
    job_title: '',
    phone: '',
    user_role: [],
    is_active: true
  });

  // 檢查權限
  const canRead = hasPermission('tenant_users', 'read');
  const canCreate = hasPermission('tenant_users', 'create');
  const canUpdate = hasPermission('tenant_users', 'update');
  const canDelete = hasPermission('tenant_users', 'delete');

  // 載入角色列表
  const loadRoles = async () => {
    try {
      const data = await getUserRoles({ is_active: true });
      setRoles(data);
    } catch (err: any) {
      console.error('Failed to load roles:', err);
    }
  };

  // 載入組織資料（判斷是否為管理組織）
  const loadOrganization = async () => {
    try {
      const profile = await getMyTenantProfile();
      setIsManaOrg(profile.is_mana ?? false);
    } catch (err: any) {
      console.error('Failed to load organization:', err);
    }
  };

  // 載入組織成員列表
  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTenantUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!permissionLoading && canRead && !hasInitialized.current) {
      hasInitialized.current = true;
      const initPage = async () => {
        try {
          // 驗證 session 有效性（檢查 token 並與後端驗證）
          const isValid = await validateSession('TenantUsersPage');
          if (!isValid) {
            return; // validateSession 會自動導向登入頁
          }

          // 載入資料（axios 攔截器會自動帶入 token 到 header，後端會驗證）
          await Promise.all([loadRoles(), loadOrganization(), loadUsers()]);
          await logView('tenant_users', {}, null);
        } catch (err: any) {
          const errorMsg = err.response?.data?.detail || err.message || t('message.loadFailed');
          await logView('tenant_users', {}, errorMsg);
        }
      };
      initPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionLoading, canRead]);

  // 非管理組織時，不顯示 is_mana 角色
  const getAvailableRoles = () => {
    if (isManaOrg) return roles;
    return roles.filter(role => !role.is_mana);
  };

  // 處理角色選擇變更
  const handleRoleChange = (roleId: number, checked: boolean, formType: 'create' | 'edit') => {
    if (formType === 'create') {
      if (checked) {
        setCreateForm({ ...createForm, user_role: [...createForm.user_role, roleId] });
      } else {
        setCreateForm({ ...createForm, user_role: createForm.user_role.filter(id => id !== roleId) });
      }
    } else {
      if (checked) {
        setEditForm({ ...editForm, user_role: [...(editForm.user_role || []), roleId] });
      } else {
        setEditForm({ ...editForm, user_role: (editForm.user_role || []).filter(id => id !== roleId) });
      }
    }
  };

  // 開啟新增視窗
  const handleOpenCreate = () => {
    if (!canCreate) {
      alert(t('message.noPermission'));
      return;
    }
    if (!user?.organization_id) {
      alert(t('common.error'));
      return;
    }
    setCreateForm({
      organization_id: user.organization_id,
      account: '',
      username: '',
      password: '',
      confirmPassword: '',
      department: '',
      job_title: '',
      phone: '',
      user_role: [],
      is_active: true
    });
    setShowCreateModal(true);
  };

  // 新增成員
  const handleCreate = async () => {
    // 驗證必填欄位
    if (!createForm.account || !createForm.username || !createForm.password) {
      alert(t('message.pleaseComplete'));
      return;
    }

    // 驗證密碼確認
    if (createForm.password !== createForm.confirmPassword) {
      alert(t('tenantUsers.passwordMismatch'));
      return;
    }

    // 檢查帳號唯一性
    const isUnique = await checkAccountUniqueness(createForm.account);
    if (!isUnique) {
      alert(t('tenantUsers.accountExists'));
      return;
    }

    try {
      setLoading(true);
      const { confirmPassword, ...dataToSend } = createForm;
      const newUser = await createTenantUser(dataToSend);
      setUsers([...users, newUser]);
      setShowCreateModal(false);
      alert(t('message.createSuccess'));

      // 記錄日誌
      try {
        await logCreate('tenant_users', newUser);
      } catch (logErr) {
        console.error('[TenantUsersPage] Failed to log create:', logErr);
      }
    } catch (err: any) {
      console.error('[TenantUsersPage] Create error:', err);
      let errorMsg = t('message.createFailed');

      // 處理錯誤訊息
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') {
          errorMsg = detail;
        } else if (typeof detail === 'object') {
          errorMsg = JSON.stringify(detail);
        }
      }

      alert(errorMsg);

      // 記錄錯誤日誌
      try {
        await logCreate('tenant_users', createForm, errorMsg);
      } catch (logErr) {
        console.error('[TenantUsersPage] Failed to log error:', logErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // 開啟編輯視窗
  const handleOpenEdit = (user: TenantUser) => {
    if (!canUpdate) {
      alert(t('message.noPermission'));
      return;
    }
    setCurrentUser(user);
    setEditForm({
      account: user.account,
      username: user.username,
      department: user.department,
      job_title: user.job_title,
      phone: user.phone,
      user_role: user.user_role,
      is_active: user.is_active
    });
    setShowEditModal(true);
  };

  // 更新成員
  const handleUpdate = async () => {
    if (!currentUser) return;

    // 驗證必填欄位
    if (!editForm.account || !editForm.username) {
      alert(t('message.pleaseComplete'));
      return;
    }

    // 檢查帳號唯一性（如果帳號有變更）
    if (editForm.account !== currentUser.account) {
      const isUnique = await checkAccountUniqueness(editForm.account, currentUser.id);
      if (!isUnique) {
        alert(t('tenantUsers.accountExists'));
        return;
      }
    }

    try {
      setLoading(true);
      const originalData = { ...currentUser };
      const updatedUser = await updateTenantUser(currentUser.id, editForm);
      setUsers(users.map(u => (u.id === currentUser.id ? updatedUser : u)));
      setShowEditModal(false);
      alert(t('message.updateSuccess'));

      // 記錄日誌
      try {
        await logUpdate('tenant_users', originalData, updatedUser);
      } catch (logErr) {
        console.error('[TenantUsersPage] Failed to log update:', logErr);
      }
    } catch (err: any) {
      console.error('[TenantUsersPage] Update error:', err);
      let errorMsg = t('message.updateFailed');

      // 處理錯誤訊息
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') {
          errorMsg = detail;
        } else if (typeof detail === 'object') {
          errorMsg = JSON.stringify(detail);
        }
      }

      alert(errorMsg);

      // 記錄錯誤日誌
      try {
        await logUpdate('tenant_users', currentUser, editForm, errorMsg);
      } catch (logErr) {
        console.error('[TenantUsersPage] Failed to log error:', logErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // 刪除成員
  const handleDelete = async (user: TenantUser) => {
    if (!canDelete) {
      alert(t('message.noPermission'));
      return;
    }

    if (!window.confirm(t('tenantUsers.confirmDelete', { username: user.username }))) {
      return;
    }

    try {
      setLoading(true);
      await deleteTenantUser(user.id);
      setUsers(users.filter(u => u.id !== user.id));
      alert(t('message.deleteSuccess'));

      // 記錄日誌
      try {
        await logDelete('tenant_users', user);
      } catch (logErr) {
        console.error('[TenantUsersPage] Failed to log delete:', logErr);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || t('message.deleteFailed');
      alert(errorMsg);

      // 記錄錯誤日誌
      try {
        await logDelete('tenant_users', user, errorMsg);
      } catch (logErr) {
        console.error('[TenantUsersPage] Failed to log error:', logErr);
      }
    } finally {
      setLoading(false);
    }
  };

  // 重設密碼
  const handleResetPassword = async (user: TenantUser) => {
    if (!canUpdate) {
      alert(t('message.noPermission'));
      return;
    }

    if (!window.confirm(t('tenantUsers.confirmResetPassword', { username: user.username }))) {
      return;
    }

    try {
      setLoading(true);
      await resetUserPassword(user.id);
      alert(t('tenantUsers.resetPasswordSuccess'));
    } catch (err: any) {
      alert(err.response?.data?.detail || t('tenantUsers.resetPasswordFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 切換啟用狀態
  const handleToggleStatus = async (user: TenantUser) => {
    if (!canUpdate) {
      alert(t('message.noPermission'));
      return;
    }

    try {
      setLoading(true);
      const updatedUser = await toggleUserStatus(user.id, !user.is_active);
      setUsers(users.map(u => (u.id === user.id ? updatedUser : u)));
      alert(t('message.updateSuccess'));
    } catch (err: any) {
      alert(err.response?.data?.detail || t('message.updateFailed'));
    } finally {
      setLoading(false);
    }
  };

  if (permissionLoading) {
    return (
      <div className="page-container">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="page-container">
        <div className="error-message">{t('common.noPermission')}</div>
      </div>
    );
  }

  // Calculate pagination
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = users.slice(startIndex, endIndex);

  return (
    <div className="page-container">
      <div className="page-header">
        <FunctionPageHeader funcCode="tenant_users" />
        {canCreate && (
          <button className="btn-primary" onClick={handleOpenCreate}>
            {t('common.create')}
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && users.length === 0 ? (
        <p>{t('common.loading')}</p>
      ) : (
        <div className="data-table-container">
          <table className="data-table">
            <thead className="table-header-dark-green">
              <tr>
                <th>{t('tenantUsers.jobTitle')}</th>
                <th>{t('tenantUsers.account')}</th>
                <th>{t('tenantUsers.username')}</th>
                <th>{t('tenantUsers.phone')}</th>
                <th>{t('tenantUsers.lastLoginAt')}</th>
                <th>{t('tenantUsers.isActive')}</th>
                <th>{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.job_title || '-'}</td>
                  <td>{user.account}</td>
                  <td>{user.username}</td>
                  <td>{user.phone || '-'}</td>
                  <td>{user.last_login_at ? new Date(user.last_login_at).toLocaleString() : '-'}</td>
                  <td>
                    <button
                      className={user.is_active ? 'status-active' : 'status-inactive'}
                      onClick={() => handleToggleStatus(user)}
                      disabled={!canUpdate || loading}
                    >
                      {user.is_active ? t('common.active') : t('common.inactive')}
                    </button>
                  </td>
                  <td className="actions">
                    {canUpdate && (
                      <>
                        <button
                          className="btn-edit"
                          onClick={() => handleOpenEdit(user)}
                          disabled={loading}
                          style={{ marginRight: '12px' }}
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => handleResetPassword(user)}
                          disabled={loading}
                          style={{ marginRight: '12px' }}
                        >
                          {t('tenantUsers.resetPassword')}
                        </button>
                      </>
                    )}
                    {canDelete && (
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(user)}
                        disabled={loading}
                      >
                        {t('common.delete')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="no-data">{t('message.noData')}</div>
          )}

          {users.length > 0 && (
            <div className="pagination-container">
              <div className="pagination-info">
                <label>
                  {t('systemCodes.itemsPerPage')}：
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  {t('systemCodes.items')}
                </label>
                <span className="pagination-text">
                  {t('systemCodes.totalRecords', {
                    total: users.length,
                    current: currentPage,
                    totalPages: totalPages
                  })}
                </span>
              </div>
              <div className="pagination-buttons">
                <button
                  className="btn-pagination"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  ⟪
                </button>
                <button
                  className="btn-pagination"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  ‹
                </button>
                <button className={`btn-pagination active`}>
                  {currentPage}
                </button>
                <button
                  className="btn-pagination"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  ›
                </button>
                <button
                  className="btn-pagination"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  ⟫
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 新增成員 Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                👥 {pageTitle} - {t('common.createOperation')}
              </h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
              <div className="modal-body">
                <div className="form-grid">
              <div className="form-group">
                <label>{t('tenantUsers.account')} *</label>
                <input
                  type="text"
                  value={createForm.account}
                  onChange={(e) => setCreateForm({ ...createForm, account: e.target.value })}
                  placeholder={t('tenantUsers.accountPlaceholder', '請輸入帳號')}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('tenantUsers.username')} *</label>
                <input
                  type="text"
                  value={createForm.username}
                  onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('tenantUsers.password')} *</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('tenantUsers.confirmPassword')} *</label>
                <input
                  type="password"
                  value={createForm.confirmPassword}
                  onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('tenantUsers.department')}</label>
                <input
                  type="text"
                  value={createForm.department}
                  onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>{t('tenantUsers.jobTitle')}</label>
                <input
                  type="text"
                  value={createForm.job_title}
                  onChange={(e) => setCreateForm({ ...createForm, job_title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>{t('tenantUsers.phone')}</label>
                <input
                  type="tel"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                />
              </div>
              <div className="form-group full-width">
                <label>{t('tenantUsers.roles')}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {getAvailableRoles().map(role => (
                    <label key={role.id} style={{ display: 'flex', alignItems: 'center', marginRight: '15px' }}>
                      <input
                        type="checkbox"
                        checked={createForm.user_role.includes(role.id)}
                        onChange={(e) => handleRoleChange(role.id, e.target.checked, 'create')}
                        style={{ marginRight: '5px' }}
                      />
                      {getI18nValue(role.role_name, i18n.language)}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={createForm.is_active}
                    onChange={(e) => setCreateForm({ ...createForm, is_active: e.target.checked })}
                  />
                  {t('tenantUsers.isActive')}
                </label>
              </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 編輯成員 Modal */}
      {showEditModal && currentUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                👥 {pageTitle} - {t('common.editOperation')}
              </h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}>
              <div className="modal-body">
                <div className="form-grid">
              <div className="form-group">
                <label>{t('tenantUsers.account')} *</label>
                <input
                  type="text"
                  value={editForm.account}
                  onChange={(e) => setEditForm({ ...editForm, account: e.target.value })}
                  placeholder={t('tenantUsers.accountPlaceholder', '請輸入帳號')}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('tenantUsers.username')} *</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('tenantUsers.department')}</label>
                <input
                  type="text"
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>{t('tenantUsers.jobTitle')}</label>
                <input
                  type="text"
                  value={editForm.job_title}
                  onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>{t('tenantUsers.phone')}</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>{t('tenantUsers.lastLoginAt')}</label>
                <input
                  type="text"
                  value={currentUser.last_login_at ? new Date(currentUser.last_login_at).toLocaleString() : '-'}
                  disabled
                />
              </div>
              <div className="form-group">
                <label>{t('tenantUsers.lastLoginIp')}</label>
                <input
                  type="text"
                  value={currentUser.last_login_ip || '-'}
                  disabled
                />
              </div>
              <div className="form-group full-width">
                <label>{t('tenantUsers.roles')}</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {getAvailableRoles().map(role => (
                    <label key={role.id} style={{ display: 'flex', alignItems: 'center', marginRight: '15px' }}>
                      <input
                        type="checkbox"
                        checked={(editForm.user_role || []).includes(role.id)}
                        onChange={(e) => handleRoleChange(role.id, e.target.checked, 'edit')}
                        style={{ marginRight: '5px' }}
                      />
                      {getI18nValue(role.role_name, i18n.language)}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editForm.is_active}
                    onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  />
                  {t('tenantUsers.isActive')}
                </label>
              </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantUsersPage;
