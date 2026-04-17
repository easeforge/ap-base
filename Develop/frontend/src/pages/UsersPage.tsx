/**
 * 使用者設定頁面
 * 使用者的 CRUD 管理
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserDetail,
  UserDetailCreate,
  getUsers,
  createUser,
  updateUser,
  deleteUser
} from '../services/userService';
import { getOrganizations, Organization } from '../services/organizationService';
import { getUserRoles, UserRole } from '../services/userRoleService';
import { getSysProfile } from '../services/sysProfileService';
import { usePermission } from '../hooks/usePermission';
import { useFunctionName } from '../hooks/useFunctionName';
import { useTransactionToken } from '../hooks/useTransactionToken';
import { useMessage } from '../contexts/MessageContext';
import { logView, logCreate, logUpdate, logDelete } from '../utils/userLogHelper';
import FunctionPageHeader from '../components/FunctionPageHeader';
import { getI18nValue } from '../utils/i18nHelper';
import '../styles/DataTable.css';

const UsersPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission, loading: permissionLoading } = usePermission();
  const pageTitle = useFunctionName('users');
  const { txnToken } = useTransactionToken('users', true, true);
  const { showSuccess, showApiError } = useMessage();
  const [users, setUsers] = useState<UserDetail[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [sysOrganizationId, setSysOrganizationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterOrganizationId, setFilterOrganizationId] = useState<number | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDetail | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isViewMode, setIsViewMode] = useState(false);
  const hasInitialized = useRef(false);
  const [formData, setFormData] = useState<UserDetailCreate>({
    organization_id: 0,
    account: '',
    username: '',
    password: '',
    department: '',
    job_title: '',
    phone: '',
    user_role: [],
    is_active: true
  });

  const loadUsers = async () => {
    if (!txnToken) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await getUsers({
        search: search || undefined,
        organization_id: filterOrganizationId
      }, txnToken);
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const data = await getOrganizations({ is_active: true });
      setOrganizations(data);
    } catch (err: any) {
      console.error('Failed to load organizations:', err);
    }
  };

  const loadRoles = async () => {
    try {
      const data = await getUserRoles({ is_active: true });
      setRoles(data);
    } catch (err: any) {
      console.error('Failed to load roles:', err);
    }
  };

  const loadSysProfile = async () => {
    try {
      const profile = await getSysProfile();
      setSysOrganizationId(profile.sys_organization);
    } catch (err: any) {
      console.error('Failed to load system profile:', err);
    }
  };

  useEffect(() => {
    // 等待權限載入完成、取得交易令牌後再載入資料
    if (!permissionLoading && hasPermission('users', 'read') && txnToken && !hasInitialized.current) {
      hasInitialized.current = true;

      const initPage = async () => {
        try {
          await loadUsers();
          await loadOrganizations();
          await loadRoles();
          await loadSysProfile();
          // 記錄功能開啟成功
          await logView('users', { search: search || undefined }, null);
        } catch (err: any) {
          const errorMsg = err.response?.data?.detail || err.message || t('message.loadFailed');
          // 記錄功能開啟失敗
          await logView('users', { search: search || undefined }, errorMsg);
        }
      };
      initPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionLoading, txnToken]);


  const handleSearch = () => {
    setCurrentPage(1);
    loadUsers();
  };

  // 當組織篩選條件改變時自動重新載入
  useEffect(() => {
    if (hasInitialized.current && txnToken) {
      setCurrentPage(1);
      loadUsers();
    }
  }, [filterOrganizationId]);

  // 分頁計算
  const filteredUsers = users;
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  const openModal = (user?: UserDetail, viewMode: boolean = false) => {
    setIsViewMode(viewMode);
    if (user) {
      setEditingUser(user);
      setFormData({
        organization_id: user.organization_id,
        account: user.account,
        username: user.username,
        password: '', // 編輯時不顯示密碼
        department: user.department || '',
        job_title: user.job_title || '',
        phone: user.phone || '',
        user_role: user.user_role || [],
        is_active: user.is_active
      });
    } else {
      setEditingUser(null);
      setFormData({
        organization_id: organizations.length > 0 ? organizations[0].id : 0,
        account: '',
        username: '',
        password: '',
        department: '',
        job_title: '',
        phone: '',
        user_role: [],
        is_active: true
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // 編輯時，如果密碼為空則不更新密碼
        const updateData: any = {
          organization_id: formData.organization_id,
          account: formData.account,
          username: formData.username,
          department: formData.department,
          job_title: formData.job_title,
          phone: formData.phone,
          user_role: formData.user_role,
          is_active: formData.is_active
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        // 修改使用者
        const updatedUser = await updateUser(editingUser.id, updateData);
        await logUpdate('users', editingUser as any, updatedUser as any);
        showSuccess('SYS020002', { name: pageTitle });
      } else {
        // 新增使用者
        const newUser = await createUser(formData);
        await logCreate('users', newUser as any);
        showSuccess('SYS020001', { name: pageTitle });
      }
      closeModal();
      loadUsers();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || t('common.error');
      if (editingUser) {
        await logUpdate('users', editingUser as any, formData, errorMsg);
      } else {
        await logCreate('users', formData, errorMsg);
      }
      showApiError(err);
    }
  };

  const handleDelete = async (user: UserDetail) => {
    if (!window.confirm(t('common.confirmDelete'))) return;

    try {
      await deleteUser(user.id);
      await logDelete('users', user as any);
      showSuccess('SYS020003', { name: pageTitle });
      loadUsers();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || t('common.error');
      await logDelete('users', user as any, errorMsg);
      showApiError(err);
    }
  };

  const handleStatusToggle = async (user: UserDetail) => {
    try {
      const updatedUser = await updateUser(user.id, {
        is_active: !user.is_active
      });
      await logUpdate('users', user as any, updatedUser as any);
      loadUsers();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || t('common.error');
      await logUpdate('users', user as any, { ...user, is_active: !user.is_active }, errorMsg);
      showApiError(err);
    }
  };

  const getOrganizationName = (orgId: number) => {
    const org = organizations.find(o => o.id === orgId);
    return org ? org.org_name : orgId.toString();
  };

  const getRoleNames = (roleIds: number[]) => {
    if (!roleIds || roleIds.length === 0) return null;
    return roleIds.map(id => {
      const role = roles.find(r => r.id === id);
      return role ? getI18nValue(role.role_name, i18n.language) : id.toString();
    });
  };

  const handleRoleChange = (roleId: number, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      user_role: checked
        ? [...prev.user_role, roleId]
        : prev.user_role.filter(id => id !== roleId)
    }));
  };

  // 非系統管理公司時，不顯示 is_mana 角色
  const getAvailableRoles = () => {
    if (formData.organization_id === sysOrganizationId) return roles;
    return roles.filter(role => !role.is_mana);
  };

  // 檢查權限
  if (permissionLoading) {
    return (
      <div className="page-container">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  if (!hasPermission('users', 'read')) {
    return (
      <div className="page-container">
        <div className="error-message">{t('common.noPermission')}</div>
      </div>
    );
  }

  const canCreate = hasPermission('users', 'create');
  const canUpdate = hasPermission('users', 'update');
  const canDelete = hasPermission('users', 'delete');

  return (
    <div className="page-container">
      <div className="page-header">
        <FunctionPageHeader funcCode="users" />
        {canCreate && (
          <button className="btn-primary" onClick={() => openModal()}>
            {t('common.create')}
          </button>
        )}
      </div>

      <div className="search-bar">
        <select
          value={filterOrganizationId || ''}
          onChange={(e) => setFilterOrganizationId(e.target.value ? parseInt(e.target.value) : undefined)}
          style={{ marginRight: '8px', minWidth: '200px' }}
        >
          <option value="">{t('users.allOrganizations')}</option>
          {organizations.map(org => (
            <option key={org.id} value={org.id}>{org.org_name}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder={t('users.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn-secondary" onClick={handleSearch}>
          {t('common.search')}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">{t('common.loading')}</div>
      ) : (
        <>
          <div className="data-table-container">
            <table className="data-table">
              <thead className="table-header-dark-green">
                <tr>
                  <th>ID</th>
                  <th>{t('users.account')}</th>
                  <th>{t('users.username')}</th>
                  <th>{t('users.organization')}</th>
                  <th>{t('users.department')}</th>
                  <th>{t('users.jobTitle')}</th>
                  <th>{t('users.roles')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.account}</td>
                    <td>{user.username}</td>
                    <td>{getOrganizationName(user.organization_id)}</td>
                    <td>{user.department || '-'}</td>
                    <td>{user.job_title || '-'}</td>
                    <td>
                      {getRoleNames(user.user_role) ? (
                        <div className="role-tags">
                          {getRoleNames(user.user_role)!.map((roleName, index) => (
                            <span key={index} className={`role-tag color-${index % 8}`}>
                              {roleName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}
                        onClick={() => handleStatusToggle(user)}
                        style={{ cursor: 'pointer' }}
                      >
                        {user.is_active ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="actions">
                      {canUpdate && (
                        <button className="btn-edit" onClick={() => openModal(user, false)} style={{ marginRight: '12px' }}>
                          {t('common.edit')}
                        </button>
                      )}
                      {!canUpdate && hasPermission('users', 'read') && (
                        <button className="btn-secondary" onClick={() => openModal(user, true)} style={{ marginRight: '12px' }}>
                          {t('common.view')}
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn-delete" onClick={() => handleDelete(user)}>
                          {t('common.delete')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分頁控制 */}
          <div className="pagination-container">
            <div className="pagination-info">
              <label>
                每頁顯示：
                <select value={itemsPerPage} onChange={handleItemsPerPageChange}>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                筆
              </label>
              <span className="pagination-text">
                共 {filteredUsers.length} 筆資料，第 {currentPage} / {totalPages} 頁
              </span>
            </div>

            <div className="pagination-buttons">
              <button
                className="btn-pagination"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                ⟪
              </button>
              <button
                className="btn-pagination"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ‹
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  if (totalPages <= 7) return true;
                  if (page === 1 || page === totalPages) return true;
                  if (page >= currentPage - 1 && page <= currentPage + 1) return true;
                  return false;
                })
                .map((page, index, array) => {
                  if (index > 0 && array[index - 1] !== page - 1) {
                    return (
                      <React.Fragment key={`ellipsis-${page}`}>
                        <span className="pagination-ellipsis">...</span>
                        <button
                          className={`btn-pagination ${currentPage === page ? 'active' : ''}`}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  }
                  return (
                    <button
                      key={page}
                      className={`btn-pagination ${currentPage === page ? 'active' : ''}`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  );
                })}

              <button
                className="btn-pagination"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                ›
              </button>
              <button
                className="btn-pagination"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                ⟫
              </button>
            </div>
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                👤 {pageTitle} - {isViewMode ? t('common.viewOperation') : (editingUser ? t('common.editOperation') : t('common.createOperation'))}
              </h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                <div className="form-group">
                  <label>{t('users.account')} *</label>
                  <input
                    type="text"
                    value={formData.account}
                    onChange={(e) => setFormData({ ...formData, account: e.target.value })}
                    required
                    disabled={isViewMode}
                  />
                </div>
                <div className="form-group">
                  <label>{t('users.username')} *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    disabled={isViewMode}
                  />
                </div>
                {!isViewMode && (
                  <div className="form-group">
                    <label>{t('users.password')} {!editingUser && '*'}</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required={!editingUser}
                      placeholder={editingUser ? t('users.passwordPlaceholder') : ''}
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>{t('users.organization')} *</label>
                  <select
                    value={formData.organization_id}
                    onChange={(e) => setFormData({ ...formData, organization_id: parseInt(e.target.value) })}
                    required
                    disabled={isViewMode}
                  >
                    <option value={0} disabled>{t('users.selectOrganization')}</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.org_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('users.department')}</label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    disabled={isViewMode}
                  />
                </div>
                <div className="form-group">
                  <label>{t('users.jobTitle')}</label>
                  <input
                    type="text"
                    value={formData.job_title}
                    onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    disabled={isViewMode}
                  />
                </div>
                <div className="form-group">
                  <label>{t('users.phone')}</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={isViewMode}
                  />
                </div>
                <div className="form-group full-width">
                  <label>{t('users.roles')}</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {(isViewMode ? roles : getAvailableRoles()).map(role => {
                      // 在檢視模式下，只顯示已分配的角色
                      if (isViewMode && !formData.user_role.includes(role.id)) {
                        return null;
                      }
                      return (
                        <label key={role.id} style={{ display: 'flex', alignItems: 'center', marginRight: '15px' }}>
                          <input
                            type="checkbox"
                            checked={formData.user_role.includes(role.id)}
                            onChange={(e) => handleRoleChange(role.id, e.target.checked)}
                            style={{ marginRight: '5px' }}
                            disabled={isViewMode}
                          />
                          {getI18nValue(role.role_name, i18n.language)}
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      disabled={isViewMode}
                    />
                    {t('common.active')}
                  </label>
                </div>
              </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  {isViewMode ? t('common.close') : t('common.cancel')}
                </button>
                {!isViewMode && (
                  <button type="submit" className="btn-primary">
                    {t('common.save')}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
