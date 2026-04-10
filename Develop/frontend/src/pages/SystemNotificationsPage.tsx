/**
 * 系統通知管理頁面
 * System Notifications Management Page
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { usePermission } from '../hooks/usePermission';
import { useFunctionName } from '../hooks/useFunctionName';
import RichTextEditor from '../components/RichTextEditor';
import FunctionPageHeader from '../components/FunctionPageHeader';
import {
  SystemNotification,
  SystemNotificationCreate,
  SystemNotificationUpdate,
  getSystemNotifications,
  getSystemNotification,
  createSystemNotification,
  updateSystemNotification,
  deleteSystemNotification,
  toggleSystemNotificationActive,
} from '../services/systemNotificationsService';
import { logView, logCreate, logUpdate, logDelete } from '../utils/userLogHelper';
import '../styles/DataTable.css';

const SystemNotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission, loading: permissionLoading } = usePermission();
  const pageTitle = useFunctionName('system_notifications');

  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [editingNotification, setEditingNotification] = useState<SystemNotification | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Form state
  const [formData, setFormData] = useState<SystemNotificationCreate>({
    notice_csubject: '',
    notice_esubject: '',
    notice_cdescription: '',
    notice_edescription: '',
    notice_start_at: new Date().toISOString().slice(0, 16),
    notice_end_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    notice_order: 0,
    is_active: true,
  });

  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const hasInitialized = useRef(false);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSystemNotifications({ search: search || undefined });
      setNotifications(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [search, t]);

  useEffect(() => {
    if (!permissionLoading && hasPermission('system_notifications', 'read') && !hasInitialized.current) {
      hasInitialized.current = true;
      const initPage = async () => {
        try {
          await loadNotifications();
          await logView('system_notifications', { search: search || undefined }, null);
        } catch (err: any) {
          const errorMsg = err.response?.data?.detail || err.message || t('message.loadFailed');
          await logView('system_notifications', { search: search || undefined }, errorMsg);
        }
      };
      initPage();
    }
  }, [permissionLoading, hasPermission, loadNotifications, search, t]);

  // Filter and pagination
  const filteredNotifications = notifications.filter((notification) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      notification.notice_csubject.toLowerCase().includes(searchLower) ||
      notification.notice_esubject.toLowerCase().includes(searchLower)
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredNotifications.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);

  // Modal handlers
  const handleCreate = () => {
    if (!hasPermission('system_notifications', 'create')) {
      alert(t('common.noPermission'));
      return;
    }
    setIsViewMode(false);
    setEditingNotification(null);
    setFormData({
      notice_csubject: '',
      notice_esubject: '',
      notice_cdescription: '',
      notice_edescription: '',
      notice_start_at: new Date().toISOString().slice(0, 16),
      notice_end_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      notice_order: 0,
      is_active: true,
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleView = async (notification: SystemNotification) => {
    if (!hasPermission('system_notifications', 'read')) {
      alert(t('common.noPermission'));
      return;
    }
    try {
      const data = await getSystemNotification(notification.id);
      setEditingNotification(data);
      setFormData({
        notice_csubject: data.notice_csubject,
        notice_esubject: data.notice_esubject,
        notice_cdescription: data.notice_cdescription,
        notice_edescription: data.notice_edescription,
        notice_start_at: data.notice_start_at.slice(0, 16),
        notice_end_at: data.notice_end_at.slice(0, 16),
        notice_order: data.notice_order,
        is_active: data.is_active,
      });
      setIsViewMode(true);
      setFormErrors({});
      setShowModal(true);
    } catch (error) {
      console.error('Failed to load notification:', error);
      alert(t('system_notifications.failedToLoadNotification'));
    }
  };

  const handleEdit = async (notification: SystemNotification) => {
    if (!hasPermission('system_notifications', 'update')) {
      alert(t('common.noPermission'));
      return;
    }
    try {
      const data = await getSystemNotification(notification.id);
      setEditingNotification(data);
      setFormData({
        notice_csubject: data.notice_csubject,
        notice_esubject: data.notice_esubject,
        notice_cdescription: data.notice_cdescription,
        notice_edescription: data.notice_edescription,
        notice_start_at: data.notice_start_at.slice(0, 16),
        notice_end_at: data.notice_end_at.slice(0, 16),
        notice_order: data.notice_order,
        is_active: data.is_active,
      });
      setIsViewMode(false);
      setFormErrors({});
      setShowModal(true);
    } catch (error) {
      console.error('Failed to load notification:', error);
      alert(t('system_notifications.failedToLoadNotification'));
    }
  };

  const handleDelete = async (notification: SystemNotification) => {
    if (!hasPermission('system_notifications', 'delete')) {
      alert(t('common.noPermission'));
      return;
    }
    if (!window.confirm(t('system_notifications.confirmDeleteNotification'))) {
      return;
    }
    try {
      await deleteSystemNotification(notification.id);
      alert(t('system_notifications.notificationDeleted'));
      loadNotifications();

      // 記錄刪除日誌
      try {
        await logDelete('system_notifications', notification);
      } catch (logErr) {
        console.error('[SystemNotificationsPage] Failed to log delete:', logErr);
      }
    } catch (error: any) {
      console.error('Failed to delete notification:', error);
      const errorMsg = t('system_notifications.failedToDeleteNotification');
      alert(errorMsg);

      // 記錄失敗日誌
      try {
        await logDelete('system_notifications', notification, errorMsg);
      } catch (logErr) {
        console.error('[SystemNotificationsPage] Failed to log error:', logErr);
      }
    }
  };

  const handleToggleActive = async (notification: SystemNotification) => {
    if (!hasPermission('system_notifications', 'update')) {
      alert(t('common.noPermission'));
      return;
    }
    try {
      await toggleSystemNotificationActive(notification.id);
      loadNotifications();
    } catch (error) {
      console.error('Failed to toggle notification status:', error);
      alert(t('system_notifications.failedToToggleStatus'));
    }
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!formData.notice_csubject.trim()) {
      errors.notice_csubject = t('system_notifications.validationNoticeCSubjectRequired');
    }
    if (!formData.notice_esubject.trim()) {
      errors.notice_esubject = t('system_notifications.validationNoticeESubjectRequired');
    }
    if (!formData.notice_cdescription.trim()) {
      errors.notice_cdescription = t('system_notifications.validationNoticeCDescriptionRequired');
    }
    if (!formData.notice_edescription.trim()) {
      errors.notice_edescription = t('system_notifications.validationNoticeEDescriptionRequired');
    }

    // Validate end time is after start time
    const startTime = new Date(formData.notice_start_at);
    const endTime = new Date(formData.notice_end_at);
    if (endTime <= startTime) {
      errors.notice_end_at = t('system_notifications.validationEndAtMustAfterStartAt');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (editingNotification) {
        // 更新操作
        const updated = await updateSystemNotification(editingNotification.id, formData as SystemNotificationUpdate);
        alert(t('system_notifications.notificationUpdated'));

        // 記錄更新日誌
        try {
          await logUpdate('system_notifications', editingNotification, updated);
        } catch (logErr) {
          console.error('[SystemNotificationsPage] Failed to log update:', logErr);
        }
      } else {
        // 新增操作
        const created = await createSystemNotification(formData);
        alert(t('system_notifications.notificationCreated'));

        // 記錄新增日誌
        try {
          await logCreate('system_notifications', created);
        } catch (logErr) {
          console.error('[SystemNotificationsPage] Failed to log create:', logErr);
        }
      }
      setShowModal(false);
      loadNotifications();
    } catch (error: any) {
      console.error('Failed to save notification:', error);
      const errorMsg = t('system_notifications.failedToSaveNotification');
      alert(errorMsg);

      // 記錄失敗日誌
      try {
        if (editingNotification) {
          await logUpdate('system_notifications', editingNotification, {}, errorMsg);
        } else {
          await logCreate('system_notifications', {}, errorMsg);
        }
      } catch (logErr) {
        console.error('[SystemNotificationsPage] Failed to log error:', logErr);
      }
    }
  };

  // Form handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));

    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: parseInt(value) || 0,
    }));
  };

  // Pagination
  const renderPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5;

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) {
        buttons.push(
          <button
            key={i}
            className={`btn-pagination ${currentPage === i ? 'active' : ''}`}
            onClick={() => setCurrentPage(i)}
          >
            {i}
          </button>
        );
      }
    } else {
      buttons.push(
        <button
          key={1}
          className={`btn-pagination ${currentPage === 1 ? 'active' : ''}`}
          onClick={() => setCurrentPage(1)}
        >
          1
        </button>
      );

      if (currentPage > 3) {
        buttons.push(<span key="ellipsis1" className="pagination-ellipsis">...</span>);
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        buttons.push(
          <button
            key={i}
            className={`btn-pagination ${currentPage === i ? 'active' : ''}`}
            onClick={() => setCurrentPage(i)}
          >
            {i}
          </button>
        );
      }

      if (currentPage < totalPages - 2) {
        buttons.push(<span key="ellipsis2" className="pagination-ellipsis">...</span>);
      }

      buttons.push(
        <button
          key={totalPages}
          className={`btn-pagination ${currentPage === totalPages ? 'active' : ''}`}
          onClick={() => setCurrentPage(totalPages)}
        >
          {totalPages}
        </button>
      );
    }

    return buttons;
  };

  if (permissionLoading) {
    return <div className="page-container"><div className="loading">{t('common.loading')}</div></div>;
  }

  if (!hasPermission('system_notifications', 'read')) {
    return <div className="page-container"><div className="error-message">{t('common.noPermission')}</div></div>;
  }

  // 統計資料
  const totalNotifications = notifications.length;
  const activeNotifications = notifications.filter(n => n.is_active).length;
  const inactiveNotifications = totalNotifications - activeNotifications;
  const currentNotifications = notifications.filter(n => {
    const now = new Date();
    return new Date(n.notice_start_at) <= now && new Date(n.notice_end_at) >= now && n.is_active;
  }).length;

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <FunctionPageHeader funcCode="system_notifications" />
        {hasPermission('system_notifications', 'create') && (
          <button className="btn-primary" onClick={handleCreate}>
            {t('common.create')}
          </button>
        )}
      </div>

      {/* 統計卡片區域 */}
      <div className="stats-cards-container">
        <div className="stats-card stats-card-blue">
          <div className="stats-card-icon">📢</div>
          <div className="stats-card-content">
            <div className="stats-card-label">{t('system_notifications.totalNotifications', '通知總數')}</div>
            <div className="stats-card-value">{totalNotifications}</div>
          </div>
        </div>

        <div className="stats-card stats-card-green">
          <div className="stats-card-icon">✅</div>
          <div className="stats-card-content">
            <div className="stats-card-label">{t('system_notifications.activeNotifications', '啟用中')}</div>
            <div className="stats-card-value">{activeNotifications}</div>
          </div>
        </div>

        <div className="stats-card stats-card-orange">
          <div className="stats-card-icon">🔔</div>
          <div className="stats-card-content">
            <div className="stats-card-label">{t('system_notifications.currentNotifications', '目前顯示')}</div>
            <div className="stats-card-value">{currentNotifications}</div>
          </div>
        </div>

        <div className="stats-card stats-card-gray">
          <div className="stats-card-icon">🚫</div>
          <div className="stats-card-content">
            <div className="stats-card-label">{t('system_notifications.inactiveNotifications', '未啟用')}</div>
            <div className="stats-card-value">{inactiveNotifications}</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-bar">
        <input
          type="text"
          placeholder={t('system_notifications.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Error Message */}
      {error && <div className="error-message">{error}</div>}

      {/* Data Table */}
      <div className="data-table-container">
        {loading ? (
          <div className="loading">{t('common.loading')}</div>
        ) : (
          <>
            <table className="data-table">
              <thead className="table-header-dark-green">
                <tr>
                  <th style={{ width: '60px' }}>{t('system_notifications.id')}</th>
                  <th>{t('system_notifications.subject')}</th>
                  <th style={{ width: '160px' }}>{t('system_notifications.noticeStartAt')}</th>
                  <th style={{ width: '160px' }}>{t('system_notifications.noticeEndAt')}</th>
                  <th style={{ width: '100px' }}>{t('system_notifications.noticeOrder')}</th>
                  <th style={{ width: '100px' }}>{t('system_notifications.isActive')}</th>
                  <th style={{ width: '150px' }}>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                      {t('system_notifications.noData')}
                    </td>
                  </tr>
                ) : (
                  currentItems.map((notification) => (
                    <tr key={notification.id}>
                      <td>{notification.id}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{notification.notice_csubject}</div>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>{notification.notice_esubject}</div>
                      </td>
                      <td>{new Date(notification.notice_start_at).toLocaleString('zh-TW', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                      })}</td>
                      <td>{new Date(notification.notice_end_at).toLocaleString('zh-TW', {
                        year: 'numeric', month: '2-digit', day: '2-digit',
                        hour: '2-digit', minute: '2-digit'
                      })}</td>
                      <td>{notification.notice_order}</td>
                      <td>
                        <span
                          className={`status-badge ${notification.is_active ? 'active' : 'inactive'}`}
                          onClick={() => hasPermission('system_notifications', 'update') && handleToggleActive(notification)}
                          style={{ cursor: hasPermission('system_notifications', 'update') ? 'pointer' : 'default' }}
                        >
                          {notification.is_active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="actions">
                        {hasPermission('system_notifications', 'update') && (
                          <button
                            className="btn-edit"
                            onClick={() => handleEdit(notification)}
                            style={{ marginRight: '12px' }}
                          >
                            {t('common.edit')}
                          </button>
                        )}
                        {!hasPermission('system_notifications', 'update') && hasPermission('system_notifications', 'read') && (
                          <button
                            className="btn-secondary"
                            onClick={() => handleView(notification)}
                            style={{ marginRight: '12px' }}
                          >
                            {t('common.view')}
                          </button>
                        )}
                        {hasPermission('system_notifications', 'delete') && (
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(notification)}
                          >
                            {t('common.delete')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 0 && (
              <div className="pagination-container">
                <div className="pagination-info">
                  <label>
                    {t('common.itemsPerPage')}:
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </label>
                  <span className="pagination-text">
                    {t('common.showing')} {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredNotifications.length)} {t('common.of')} {filteredNotifications.length}
                  </span>
                </div>
                <div className="pagination-buttons">
                  <button
                    className="btn-pagination"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    «
                  </button>
                  <button
                    className="btn-pagination"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    ‹
                  </button>
                  {renderPaginationButtons()}
                  <button
                    className="btn-pagination"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    ›
                  </button>
                  <button
                    className="btn-pagination"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => !isViewMode && setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                📋 {pageTitle} - {isViewMode ? t('common.viewOperation') : (editingNotification ? t('common.editOperation') : t('common.createOperation'))}
              </h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                <div className="form-group">
                  <label>{t('system_notifications.noticeCSubject')} *</label>
                  <input
                    type="text"
                    name="notice_csubject"
                    value={formData.notice_csubject}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                    maxLength={200}
                    style={{ borderColor: formErrors.notice_csubject ? '#e74c3c' : undefined }}
                  />
                  {formErrors.notice_csubject && (
                    <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>
                      {formErrors.notice_csubject}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label>{t('system_notifications.noticeESubject')} *</label>
                  <input
                    type="text"
                    name="notice_esubject"
                    value={formData.notice_esubject}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                    maxLength={200}
                    style={{ borderColor: formErrors.notice_esubject ? '#e74c3c' : undefined }}
                  />
                  {formErrors.notice_esubject && (
                    <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>
                      {formErrors.notice_esubject}
                    </span>
                  )}
                </div>

                <div className="form-group full-width">
                  <label>{t('system_notifications.noticeCDescription')} *</label>
                  {showModal && (
                    <RichTextEditor
                      key={`cdesc-${editingNotification?.id || 'new'}`}
                      value={editingNotification?.notice_cdescription || formData.notice_cdescription}
                      onChange={(html) => setFormData({ ...formData, notice_cdescription: html })}
                      disabled={isViewMode}
                      placeholder={t('system_notifications.noticeCDescription')}
                    />
                  )}
                  {formErrors.notice_cdescription && (
                    <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      {formErrors.notice_cdescription}
                    </span>
                  )}
                </div>

                <div className="form-group full-width">
                  <label>{t('system_notifications.noticeEDescription')} *</label>
                  {showModal && (
                    <RichTextEditor
                      key={`edesc-${editingNotification?.id || 'new'}`}
                      value={editingNotification?.notice_edescription || formData.notice_edescription}
                      onChange={(html) => setFormData({ ...formData, notice_edescription: html })}
                      disabled={isViewMode}
                      placeholder={t('system_notifications.noticeEDescription')}
                    />
                  )}
                  {formErrors.notice_edescription && (
                    <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      {formErrors.notice_edescription}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label>{t('system_notifications.noticeStartAt')} *</label>
                  <input
                    type="datetime-local"
                    name="notice_start_at"
                    value={formData.notice_start_at}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                  />
                </div>

                <div className="form-group">
                  <label>{t('system_notifications.noticeEndAt')} *</label>
                  <input
                    type="datetime-local"
                    name="notice_end_at"
                    value={formData.notice_end_at}
                    onChange={handleInputChange}
                    disabled={isViewMode}
                    style={{ borderColor: formErrors.notice_end_at ? '#e74c3c' : undefined }}
                  />
                  {formErrors.notice_end_at && (
                    <span style={{ color: '#e74c3c', fontSize: '12px', marginTop: '4px' }}>
                      {formErrors.notice_end_at}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label>{t('system_notifications.noticeOrder')}</label>
                  <input
                    type="number"
                    name="notice_order"
                    value={formData.notice_order}
                    onChange={handleNumberInputChange}
                    disabled={isViewMode}
                    min={0}
                  />
                  <span style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                    {t('system_notifications.orderHint')}
                  </span>
                </div>

                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', marginBottom: 0 }}>
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      disabled={isViewMode}
                    />
                    {t('system_notifications.isActive')}
                  </label>
                </div>
              </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
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

export default SystemNotificationsPage;
