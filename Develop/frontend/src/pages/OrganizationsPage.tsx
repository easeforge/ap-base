/**
 * 組織設定頁面
 * 組織單位的 CRUD 管理
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Organization,
  OrganizationCreate,
  getOrganizations,
  createOrganization,
  updateOrganization,
  deleteOrganization
} from '../services/organizationService';
import { usePermission } from '../hooks/usePermission';
import { useFunctionName } from '../hooks/useFunctionName';
import { logView, logCreate, logUpdate, logDelete } from '../utils/userLogHelper';
import FunctionPageHeader from '../components/FunctionPageHeader';
import '../styles/DataTable.css';

const OrganizationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission, loading: permissionLoading } = usePermission();
  const pageTitle = useFunctionName('organizations');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isViewMode, setIsViewMode] = useState(false);
  const hasInitialized = useRef(false);
  const [formData, setFormData] = useState<OrganizationCreate>({
    org_code: '',
    org_name: '',
    org_type: 2,
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    phone: '',
    is_mana: false,
    is_active: true,
    memo: ''
  });

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getOrganizations({ search: search || undefined });
      setOrganizations(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 等待權限載入完成後再檢查權限並載入資料
    // 使用 ref 確保只執行一次，避免 StrictMode 重複執行
    if (!permissionLoading && hasPermission('organizations', 'read') && !hasInitialized.current) {
      hasInitialized.current = true;

      // 記錄功能開啟（View）
      const initPage = async () => {
        try {
          await loadOrganizations();
          // 功能正確開啟，記錄成功
          await logView('organizations', { search: search || undefined }, null);
        } catch (err: any) {
          // 功能開啟發生錯誤，記錄錯誤
          const errorMsg = err.response?.data?.detail || err.message || t('message.loadFailed');
          await logView('organizations', { search: search || undefined }, errorMsg);
        }
      };
      initPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionLoading]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadOrganizations();
  };

  // 分頁計算
  const filteredOrganizations = organizations;
  const totalPages = Math.ceil(filteredOrganizations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentOrganizations = filteredOrganizations.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value));
    setCurrentPage(1);
  };

  const openModal = (org?: Organization, viewMode: boolean = false) => {
    setIsViewMode(viewMode);
    if (org) {
      setEditingOrg(org);
      setFormData({
        org_code: org.org_code,
        org_name: org.org_name,
        org_type: org.org_type,
        contact_person: org.contact_person,
        contact_email: org.contact_email,
        contact_phone: org.contact_phone,
        address: org.address || '',
        phone: org.phone || '',
        is_mana: org.is_mana,
        is_active: org.is_active,
        memo: org.memo || ''
      });
    } else {
      setEditingOrg(null);
      setFormData({
        org_code: '',
        org_name: '',
        org_type: 2,
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        address: '',
        phone: '',
        is_mana: false,
        is_active: true,
        memo: ''
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingOrg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOrg) {
        // 修改組織
        const updatedOrg = await updateOrganization(editingOrg.id, formData);
        // 記錄成功的更新操作 - 使用舊資料和新回傳的完整資料
        await logUpdate('organizations', editingOrg as any, updatedOrg as any);
        alert(t('message.saveSuccess'));
      } else {
        // 新增組織
        const newOrg = await createOrganization(formData);
        // 記錄成功的新增操作 - 使用後端回傳的完整資料
        await logCreate('organizations', newOrg as any);
        alert(t('message.createSuccess'));
      }
      closeModal();
      loadOrganizations();
    } catch (err: any) {
      // 記錄失敗的操作
      const errorMsg = err.response?.data?.detail || err.message || t('common.error');

      // 先記錄失敗日誌
      try {
        if (editingOrg) {
          await logUpdate('organizations', editingOrg as any, formData, errorMsg);
        } else {
          await logCreate('organizations', formData, errorMsg);
        }
      } catch (logErr) {
        console.error('[OrganizationsPage] Failed to log error:', logErr);
      }

      // 顯示錯誤訊息（確保一定會執行）
      alert(errorMsg);
    }
  };

  const handleDelete = async (org: Organization) => {
    if (!window.confirm(t('common.confirmDelete'))) return;

    try {
      await deleteOrganization(org.id);
      // 記錄成功的刪除操作
      await logDelete('organizations', org as any);
      alert(t('message.deleteSuccess'));
      loadOrganizations();
    } catch (err: any) {
      // 記錄失敗的刪除操作
      const errorMsg = err.response?.data?.detail || t('common.error');
      await logDelete('organizations', org as any, errorMsg);
      alert(errorMsg);
    }
  };

  const getOrgTypeText = (type: number) => {
    const types: { [key: number]: string } = {
      1: t('organizations.types.government'),
      2: t('organizations.types.company'),
      3: t('organizations.types.individual')
    };
    return types[type] || type.toString();
  };

  // 檢查權限
  if (permissionLoading) {
    return (
      <div className="page-container">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  if (!hasPermission('organizations', 'read')) {
    return (
      <div className="page-container">
        <div className="error-message">{t('common.noPermission')}</div>
      </div>
    );
  }

  const canCreate = hasPermission('organizations', 'create');
  const canUpdate = hasPermission('organizations', 'update');
  const canDelete = hasPermission('organizations', 'delete');

  return (
    <div className="page-container">
      <div className="page-header">
        <FunctionPageHeader funcCode="organizations" />
        {canCreate && (
          <button className="btn-primary" onClick={() => openModal()}>
            {t('common.create')}
          </button>
        )}
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder={t('organizations.searchPlaceholder')}
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
                  <th>{t('organizations.orgCode')}</th>
                  <th>{t('organizations.orgName')}</th>
                  <th>{t('organizations.orgType')}</th>
                  <th>{t('organizations.contactPerson')}</th>
                  <th>{t('organizations.contactEmail')}</th>
                  <th>{t('organizations.contactPhone')}</th>
                  <th>{t('common.status')}</th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {currentOrganizations.map((org) => (
                  <tr key={org.id}>
                    <td>{org.org_code}</td>
                    <td>{org.org_name}</td>
                    <td>{getOrgTypeText(org.org_type)}</td>
                    <td>{org.contact_person}</td>
                    <td>{org.contact_email}</td>
                    <td>{org.contact_phone}</td>
                    <td>
                      <span className={`status-badge ${org.is_active ? 'active' : 'inactive'}`}>
                        {org.is_active ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="actions">
                      {canUpdate && (
                        <button className="btn-edit" onClick={() => openModal(org, false)} style={{ marginRight: '12px' }}>
                          {t('common.edit')}
                        </button>
                      )}
                      {!canUpdate && hasPermission('organizations', 'read') && (
                        <button className="btn-secondary" onClick={() => openModal(org, true)} style={{ marginRight: '12px' }}>
                          {t('common.view')}
                        </button>
                      )}
                      {canDelete && (
                        <button className="btn-delete" onClick={() => handleDelete(org)}>
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
                共 {filteredOrganizations.length} 筆資料，第 {currentPage} / {totalPages} 頁
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
                🏢 {pageTitle} - {isViewMode ? t('common.viewOperation') : (editingOrg ? t('common.editOperation') : t('common.createOperation'))}
              </h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                <div className="form-group">
                  <label>{t('organizations.orgCode')} *</label>
                  <input
                    type="text"
                    value={formData.org_code}
                    onChange={(e) => setFormData({ ...formData, org_code: e.target.value })}
                    required
                    disabled={isViewMode}
                  />
                </div>
                <div className="form-group">
                  <label>{t('organizations.orgName')} *</label>
                  <input
                    type="text"
                    value={formData.org_name}
                    onChange={(e) => setFormData({ ...formData, org_name: e.target.value })}
                    required
                    disabled={isViewMode}
                  />
                </div>
                <div className="form-group">
                  <label>{t('organizations.orgType')} *</label>
                  <select
                    value={formData.org_type}
                    onChange={(e) => setFormData({ ...formData, org_type: parseInt(e.target.value) })}
                    required
                    disabled={isViewMode}
                  >
                    <option value={1}>{t('organizations.types.government')}</option>
                    <option value={2}>{t('organizations.types.company')}</option>
                    <option value={3}>{t('organizations.types.individual')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>{t('organizations.contactPerson')} *</label>
                  <input
                    type="text"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    required
                    disabled={isViewMode}
                  />
                </div>
                <div className="form-group">
                  <label>{t('organizations.contactEmail')} *</label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    required
                    disabled={isViewMode}
                  />
                </div>
                <div className="form-group">
                  <label>{t('organizations.contactPhone')} *</label>
                  <input
                    type="text"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    required
                    disabled={isViewMode}
                  />
                </div>
                <div className="form-group">
                  <label>{t('organizations.address')}</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    disabled={isViewMode}
                  />
                </div>
                <div className="form-group">
                  <label>{t('organizations.phone')}</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={isViewMode}
                  />
                </div>
                <div className="form-group full-width">
                  <label>{t('common.memo')}</label>
                  <textarea
                    value={formData.memo}
                    onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                    rows={3}
                    disabled={isViewMode}
                  />
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

export default OrganizationsPage;
