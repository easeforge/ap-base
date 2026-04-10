/**
 * 使用者角色設定頁面
 * 使用者角色的 CRUD 管理
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserRole,
  UserRoleCreate,
  getUserRoles,
  createUserRole,
  updateUserRole,
  deleteUserRole
} from '../services/userRoleService';
import { usePermission } from '../hooks/usePermission';
import { useFunctionName } from '../hooks/useFunctionName';
import { logView, logCreate, logUpdate, logDelete } from '../utils/userLogHelper';
import { validateSession } from '../utils/sessionValidator';
import FunctionPageHeader from '../components/FunctionPageHeader';
import '../styles/DataTable.css';

const UserRolesPage: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission, loading: permissionLoading } = usePermission();
  const pageTitle = useFunctionName('user_roles');
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<UserRole | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isViewMode, setIsViewMode] = useState(false);
  const hasInitialized = useRef(false);
  const [formData, setFormData] = useState<UserRoleCreate>({
    role_cname: '',
    role_ename: '',
    description: '',
    is_mana: false,
    is_active: true
  });

  const loadRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserRoles({ search: search || undefined });
      setRoles(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 等待權限載入完成後再檢查權限並載入資料
    // 使用 ref 確保只執行一次，避免 StrictMode 重複執行
    if (!permissionLoading && hasPermission('user_roles', 'read') && !hasInitialized.current) {
      hasInitialized.current = true;

      const initPage = async () => {
        try {
          // 驗證 session 有效性（檢查 token 並與後端驗證）
          const isValid = await validateSession('UserRolesPage');
          if (!isValid) {
            return; // validateSession 會自動導向登入頁
          }

          // 載入資料（axios 攔截器會自動帶入 token 到 header，後端會驗證）
          await loadRoles();
          await logView('user_roles', { search: search || undefined }, null);
        } catch (err: any) {
          const errorMsg = err.response?.data?.detail || err.message || t('message.loadFailed');
          await logView('user_roles', { search: search || undefined }, errorMsg);
        }
      };
      initPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionLoading]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadRoles();
  };

  // 分頁計算
  const filteredRoles = roles;
  const totalPages = Math.ceil(filteredRoles.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentRoles = filteredRoles.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  const openModal = (role?: UserRole, viewMode: boolean = false) => {
    setIsViewMode(viewMode);
    if (role) {
      setEditingRole(role);
      setFormData({
        role_cname: role.role_cname,
        role_ename: role.role_ename,
        description: role.description || '',
        is_mana: role.is_mana,
        is_active: role.is_active
      });
    } else {
      setEditingRole(null);
      setFormData({
        role_cname: '',
        role_ename: '',
        description: '',
        is_mana: false,
        is_active: true
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRole(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRole) {
        const updatedRole = await updateUserRole(editingRole.id, formData);
        await logUpdate('user_roles', editingRole as any, updatedRole as any);
        alert(t('message.saveSuccess'));
      } else {
        const newRole = await createUserRole(formData);
        await logCreate('user_roles', newRole as any);
        alert(t('message.createSuccess'));
      }
      closeModal();
      loadRoles();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || t('common.error');
      if (editingRole) {
        await logUpdate('user_roles', editingRole as any, formData, errorMsg);
      } else {
        await logCreate('user_roles', formData, errorMsg);
      }
      alert(errorMsg);
    }
  };

  const handleDelete = async (role: UserRole) => {
    if (!window.confirm(t('common.confirmDelete'))) return;

    try {
      await deleteUserRole(role.id);
      await logDelete('user_roles', role as any);
      alert(t('message.deleteSuccess'));
      loadRoles();
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || t('common.error');
      await logDelete('user_roles', role as any, errorMsg);
      alert(errorMsg);
    }
  };

  const handleStatusToggle = async (role: UserRole) => {
    try {
      await updateUserRole(role.id, {
        ...role,
        is_active: !role.is_active
      });
      loadRoles();
    } catch (err: any) {
      alert(err.response?.data?.detail || t('common.error'));
    }
  };

  // 檢查權限
  if (permissionLoading) {
    return (
      <div className="page-container">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  if (!hasPermission('user_roles', 'read')) {
    return (
      <div className="page-container">
        <div className="error-message">{t('common.noPermission')}</div>
      </div>
    );
  }

  const canCreate = hasPermission('user_roles', 'create');
  const canUpdate = hasPermission('user_roles', 'update');
  const canDelete = hasPermission('user_roles', 'delete');

  return (
    <div className="page-container">
      <div className="page-header">
        <FunctionPageHeader funcCode="user_roles" />
        {canCreate && (
          <button className="btn-primary" onClick={() => openModal()}>
            {t('common.create')}
          </button>
        )}
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder={t('userRoles.searchPlaceholder')}
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
                  <th>{t('userRoles.roleCname')}</th>
                  <th>{t('userRoles.roleEname')}</th>
                  <th>{t('userRoles.description')}</th>
                  <th>{t('userRoles.isMana')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {currentRoles.map((role) => (
                  <tr key={role.id}>
                    <td>{role.id}</td>
                    <td>{role.role_cname}</td>
                    <td>{role.role_ename}</td>
                    <td>{role.description}</td>
                    <td>
                      <span className={`status-badge ${role.is_mana ? 'active' : 'inactive'}`}>
                        {role.is_mana ? t('common.yes') : t('common.no')}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${role.is_active ? 'active' : 'inactive'}`}
                        onClick={() => handleStatusToggle(role)}
                        style={{ cursor: 'pointer' }}
                      >
                        {role.is_active ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="actions">
                      {canUpdate && (
                        <button className="btn-edit" onClick={() => openModal(role, false)} style={{ marginRight: '12px' }}>
                          {t('common.edit')}
                        </button>
                      )}
                      {!canUpdate && hasPermission('user_roles', 'read') && (
                        <button className="btn-secondary" onClick={() => openModal(role, true)} style={{ marginRight: '12px' }}>
                          {t('common.view')}
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn-delete" onClick={() => handleDelete(role)}>
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
                共 {filteredRoles.length} 筆資料，第 {currentPage} / {totalPages} 頁
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
                🔑 {pageTitle} - {isViewMode ? t('common.viewOperation') : (editingRole ? t('common.editOperation') : t('common.createOperation'))}
              </h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                <div className="form-group">
                  <label>{t('userRoles.roleCname')} *</label>
                  <input
                    type="text"
                    value={formData.role_cname}
                    onChange={(e) => setFormData({ ...formData, role_cname: e.target.value })}
                    required
                    disabled={isViewMode}
                  />
                </div>
                <div className="form-group">
                  <label>{t('userRoles.roleEname')} *</label>
                  <input
                    type="text"
                    value={formData.role_ename}
                    onChange={(e) => setFormData({ ...formData, role_ename: e.target.value })}
                    required
                    disabled={isViewMode}
                  />
                </div>
                <div className="form-group full-width">
                  <label>{t('userRoles.description')}</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    disabled={isViewMode}
                  />
                </div>
                <div className="form-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={formData.is_mana}
                      onChange={(e) => setFormData({ ...formData, is_mana: e.target.checked })}
                      disabled={isViewMode}
                    />
                    {t('userRoles.isMana')}
                  </label>
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

export default UserRolesPage;
