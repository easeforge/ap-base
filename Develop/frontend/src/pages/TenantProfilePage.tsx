/**
 * 組織資料維護頁面
 * Tenant Profile Page
 *
 * 功能說明：
 * 1. 讀取權限：檢視所屬組織資料（唯讀模式，欄位及按鈕 disabled）
 * 2. 修改權限：修改所屬組織資料（可編輯模式，欄位及按鈕 enabled）
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TenantProfile, TenantProfileUpdate } from '../types/tenantProfile';
import { getMyTenantProfile, updateTenantProfile } from '../services/tenantProfileService';
import { usePermission } from '../hooks/usePermission';
import { useMessage } from '../contexts/MessageContext';
import { logView, logUpdate } from '../utils/userLogHelper';
import FunctionPageHeader from '../components/FunctionPageHeader';
import '../styles/DataTable.css';

const TenantProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission, loading: permissionLoading } = usePermission();
  const { showSuccess, showError, showApiError } = useMessage();
  const hasInitialized = useRef(false);

  const [tenantProfile, setTenantProfile] = useState<TenantProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState<TenantProfileUpdate>({
    org_code: '',
    org_name: '',
    org_type: 1,
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    phone: '',
    memo: ''
  });

  // 檢查權限
  const canRead = hasPermission('tenant_profile', 'read');
  const canUpdate = hasPermission('tenant_profile', 'update');

  // 載入組織資料
  const loadTenantProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyTenantProfile();
      setTenantProfile(data);

      // 填充表單資料
      setFormData({
        org_code: data.org_code,
        org_name: data.org_name,
        org_type: data.org_type,
        contact_person: data.contact_person,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone,
        address: data.address || '',
        phone: data.phone || '',
        memo: data.memo || ''
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 等待權限載入完成後再載入資料
    if (!permissionLoading && canRead && !hasInitialized.current) {
      hasInitialized.current = true;
      const initPage = async () => {
        try {
          await loadTenantProfile();
          await logView('tenant_profile', {}, null);
        } catch (err: any) {
          const errorMsg = err.response?.data?.detail || err.message || t('message.loadFailed');
          await logView('tenant_profile', {}, errorMsg);
        }
      };
      initPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionLoading, canRead]);

  // 進入編輯模式
  const handleEdit = () => {
    if (!canUpdate) {
      showError('ERR020003', { action: 'edit tenant profile' });
      return;
    }
    setIsEditing(true);
  };

  // 取消編輯
  const handleCancel = () => {
    if (!tenantProfile) return;

    // 恢復原始資料
    setFormData({
      org_code: tenantProfile.org_code,
      org_name: tenantProfile.org_name,
      org_type: tenantProfile.org_type,
      contact_person: tenantProfile.contact_person,
      contact_email: tenantProfile.contact_email,
      contact_phone: tenantProfile.contact_phone,
      address: tenantProfile.address || '',
      phone: tenantProfile.phone || '',
      memo: tenantProfile.memo || ''
    });
    setIsEditing(false);
  };

  // 儲存變更
  const handleSave = async () => {
    if (!tenantProfile || !canUpdate) {
      showError('ERR020003', { action: 'save tenant profile' });
      return;
    }

    try {
      setLoading(true);
      const originalData = { ...tenantProfile };
      const updatedData = await updateTenantProfile(formData); // 不再需要傳遞 id

      setTenantProfile(updatedData);
      setIsEditing(false);
      showSuccess('SYS020002', { name: t('tenantProfile.title', '組織資料') });

      // 記錄日誌
      try {
        await logUpdate('tenant_profile', originalData, updatedData);
      } catch (logErr) {
        console.error('[TenantProfilePage] Failed to log update:', logErr);
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || t('message.updateFailed');
      showApiError(err);

      // 記錄錯誤日誌
      try {
        await logUpdate('tenant_profile', tenantProfile, formData, errorMsg);
      } catch (logErr) {
        console.error('[TenantProfilePage] Failed to log error:', logErr);
      }
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

  return (
    <div className="page-container">
      <div className="page-header">
        <FunctionPageHeader funcCode="tenant_profile" />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {!isEditing && canUpdate && (
            <button className="btn-primary" onClick={handleEdit}>
              {t('common.edit')}
            </button>
          )}
          {isEditing && (
            <>
              <button className="btn-primary" onClick={handleSave} disabled={loading}>
                {t('common.save')}
              </button>
              <button className="btn-secondary" onClick={handleCancel}>
                {t('common.cancel')}
              </button>
            </>
          )}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading && !tenantProfile ? (
        <p>{t('common.loading')}</p>
      ) : tenantProfile ? (
        <div className="form-container" style={{ maxWidth: '800px' }}>
          <div className="form-grid">
            {/* 組織代碼 */}
            <div className="form-group">
              <label>{t('tenantProfile.orgCode')} *</label>
              <input
                type="text"
                value={formData.org_code}
                onChange={(e) => setFormData({ ...formData, org_code: e.target.value })}
                disabled={!isEditing}
                required
              />
            </div>

            {/* 組織名稱 */}
            <div className="form-group">
              <label>{t('tenantProfile.orgName')} *</label>
              <input
                type="text"
                value={formData.org_name}
                onChange={(e) => setFormData({ ...formData, org_name: e.target.value })}
                disabled={!isEditing}
                required
              />
            </div>

            {/* 組織型態 */}
            <div className="form-group">
              <label>{t('tenantProfile.orgType')} *</label>
              <select
                value={formData.org_type}
                onChange={(e) => setFormData({ ...formData, org_type: Number(e.target.value) })}
                disabled={!isEditing}
                required
              >
                <option value={1}>{t('tenantProfile.orgTypes.government')}</option>
                <option value={2}>{t('tenantProfile.orgTypes.company')}</option>
                <option value={3}>{t('tenantProfile.orgTypes.individual')}</option>
              </select>
            </div>

            {/* 系統管理公司 (唯讀顯示) */}
            <div className="form-group">
              <label>{t('tenantProfile.isMana')}</label>
              <input
                type="text"
                value={tenantProfile.is_mana ? t('common.yes') : t('common.no')}
                disabled
              />
            </div>

            {/* 連絡人 */}
            <div className="form-group">
              <label>{t('tenantProfile.contactPerson')} *</label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                disabled={!isEditing}
                required
              />
            </div>

            {/* 連絡人電子郵件 */}
            <div className="form-group">
              <label>{t('tenantProfile.contactEmail')} *</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                disabled={!isEditing}
                required
              />
            </div>

            {/* 聯絡人電話 */}
            <div className="form-group">
              <label>{t('tenantProfile.contactPhone')} *</label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                disabled={!isEditing}
                required
              />
            </div>

            {/* 組織代表號 */}
            <div className="form-group">
              <label>{t('tenantProfile.phone')}</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            {/* 組織地址 */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>{t('tenantProfile.address')}</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            {/* 備註 */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>{t('tenantProfile.memo')}</label>
              <textarea
                value={formData.memo}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                disabled={!isEditing}
                rows={4}
              />
            </div>
          </div>

          {/* 權限提示 */}
          {!canUpdate && (
            <div className="info-message" style={{ marginTop: '1rem' }}>
              {t('tenantProfile.readOnlyHint')}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default TenantProfilePage;
