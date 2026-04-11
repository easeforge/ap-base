/**
 * 系統設定資料頁面
 * 顯示和修改系統設定（id=1）
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  SysProfile,
  SysProfileUpdate,
  getSysProfile,
  updateSysProfile
} from '../services/sysProfileService';
import { getOrganizations, Organization } from '../services/organizationService';
import { usePermission } from '../hooks/usePermission';
import { useSystem } from '../contexts/SystemContext';
import FunctionPageHeader from '../components/FunctionPageHeader';
import { logView, logUpdate } from '../utils/userLogHelper';
import { I18nField } from '../types';
import '../styles/DataTable.css';

const SysProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { hasPermission, loading: permissionLoading } = usePermission();
  const { refreshSystemProfile } = useSystem();
  const hasInitialized = useRef(false);
  const [profile, setProfile] = useState<SysProfile | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<SysProfileUpdate>({});

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSysProfile();
      setProfile(data);
      setFormData({
        is_service: data.is_service,
        sys_url: data.sys_url,
        sys_title: data.sys_title || {'zh-TW': '', 'en': ''} as I18nField,
        sys_copyright: data.sys_copyright || {'zh-TW': '', 'en': ''} as I18nField,
        sys_organization: data.sys_organization,
        sys_mana_email: data.sys_mana_email,
        sys_timezone: data.sys_timezone
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      const data = await getOrganizations();
      setOrganizations(data);
    } catch (err) {
      console.error('Failed to load organizations:', err);
    }
  };

  useEffect(() => {
    // 等待權限載入完成後再檢查權限並載入資料
    if (!permissionLoading && hasPermission('sys_profile', 'read') && !hasInitialized.current) {
      hasInitialized.current = true;
      const initPage = async () => {
        try {
          await loadProfile();
          await loadOrganizations();
          await logView('sys_profile', {}, null);
        } catch (err: any) {
          const errorMsg = err.response?.data?.detail || err.message || t('message.loadFailed');
          await logView('sys_profile', {}, errorMsg);
        }
      };
      initPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      const updated = await updateSysProfile(formData);
      await logUpdate('sys_profile', profile as any, updated as any);

      // 重新載入頁面資料
      loadProfile();

      // 重新載入全域系統設定（立即更新 Title 和版權宣告）
      await refreshSystemProfile();

      alert(t('message.saveSuccess'));
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || t('message.saveFailed');

      try {
        await logUpdate('sys_profile', profile as any, formData, errorMsg);
      } catch (logErr) {
        console.error('[SysProfilePage] Failed to log error:', logErr);
      }

      alert(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // 檢查讀取權限
  if (permissionLoading) {
    return (
      <div className="page-container">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  if (!hasPermission('sys_profile', 'read')) {
    return (
      <div className="page-container">
        <div className="error-message">{t('common.noPermission')}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  // 檢查修改權限
  const canUpdate = hasPermission('sys_profile', 'update');

  return (
    <div className="page-container">
      <div className="page-header">
        <FunctionPageHeader funcCode="sys_profile" />
      </div>

      <div className="data-table-container">
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div className="form-grid">
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.is_service || false}
                  onChange={(e) => setFormData({ ...formData, is_service: e.target.checked })}
                  disabled={!canUpdate}
                />
                {t('sysProfile.isService')} 
                <span style={{ marginLeft: '8px', color: formData.is_service ? '#28a745' : '#dc3545' }}>
                  ({formData.is_service ? t('sysProfile.serviceEnabled') : t('sysProfile.serviceDisabled')})
                </span>
              </label>
            </div>

            <div className="form-group full-width">
              <label>{t('sysProfile.sysUrl')} *</label>
              <input
                type="url"
                value={formData.sys_url || ''}
                onChange={(e) => setFormData({ ...formData, sys_url: e.target.value })}
                required
                disabled={!canUpdate}
              />
            </div>

            <div className="form-group">
              <label>{t('sysProfile.sysCTitle')} *</label>
              <input
                type="text"
                value={(formData.sys_title as I18nField)?.['zh-TW'] || ''}
                onChange={(e) => setFormData({ ...formData, sys_title: {...(formData.sys_title as I18nField), 'zh-TW': e.target.value} })}
                required
                disabled={!canUpdate}
              />
            </div>

            <div className="form-group">
              <label>{t('sysProfile.sysETitle')} *</label>
              <input
                type="text"
                value={(formData.sys_title as I18nField)?.['en'] || ''}
                onChange={(e) => setFormData({ ...formData, sys_title: {...(formData.sys_title as I18nField), 'en': e.target.value} })}
                required
                disabled={!canUpdate}
              />
            </div>

            <div className="form-group">
              <label>{t('sysProfile.sysCCopyright')} *</label>
              <input
                type="text"
                value={(formData.sys_copyright as I18nField)?.['zh-TW'] || ''}
                onChange={(e) => setFormData({ ...formData, sys_copyright: {...(formData.sys_copyright as I18nField), 'zh-TW': e.target.value} })}
                required
                disabled={!canUpdate}
              />
            </div>

            <div className="form-group">
              <label>{t('sysProfile.sysECopyright')} *</label>
              <input
                type="text"
                value={(formData.sys_copyright as I18nField)?.['en'] || ''}
                onChange={(e) => setFormData({ ...formData, sys_copyright: {...(formData.sys_copyright as I18nField), 'en': e.target.value} })}
                required
                disabled={!canUpdate}
              />
            </div>

            <div className="form-group">
              <label>{t('sysProfile.sysOrganization')} *</label>
              <select
                value={formData.sys_organization || 1}
                onChange={(e) => setFormData({ ...formData, sys_organization: parseInt(e.target.value) })}
                required
                disabled={!canUpdate}
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.org_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>{t('sysProfile.sysManaEmail')} *</label>
              <input
                type="email"
                value={formData.sys_mana_email || ''}
                onChange={(e) => setFormData({ ...formData, sys_mana_email: e.target.value })}
                required
                disabled={!canUpdate}
              />
            </div>
            <div className="form-group">
              <label>{t('sysProfile.sysTimezone')} *</label>
              <select
                value={formData.sys_timezone || 'Asia/Taipei'}
                onChange={(e) => setFormData({ ...formData, sys_timezone: e.target.value })}
                required
                disabled={!canUpdate}
              >
                <optgroup label="Asia">
                  <option value="Asia/Taipei">Asia/Taipei (UTC+8)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                  <option value="Asia/Shanghai">Asia/Shanghai (UTC+8)</option>
                  <option value="Asia/Hong_Kong">Asia/Hong_Kong (UTC+8)</option>
                  <option value="Asia/Singapore">Asia/Singapore (UTC+8)</option>
                  <option value="Asia/Seoul">Asia/Seoul (UTC+9)</option>
                  <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
                  <option value="Asia/Kolkata">Asia/Kolkata (UTC+5:30)</option>
                  <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
                </optgroup>
                <optgroup label="Europe">
                  <option value="Europe/London">Europe/London (UTC+0/+1)</option>
                  <option value="Europe/Paris">Europe/Paris (UTC+1/+2)</option>
                  <option value="Europe/Berlin">Europe/Berlin (UTC+1/+2)</option>
                </optgroup>
                <optgroup label="America">
                  <option value="America/New_York">America/New_York (UTC-5/-4)</option>
                  <option value="America/Chicago">America/Chicago (UTC-6/-5)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (UTC-8/-7)</option>
                </optgroup>
                <optgroup label="Pacific">
                  <option value="Pacific/Auckland">Pacific/Auckland (UTC+12/+13)</option>
                  <option value="Australia/Sydney">Australia/Sydney (UTC+10/+11)</option>
                </optgroup>
                <optgroup label="UTC">
                  <option value="UTC">UTC (UTC+0)</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: '24px' }}>
            {canUpdate && (
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? t('common.loading') : t('common.save')}
              </button>
            )}
            {!canUpdate && (
              <div style={{ color: '#dc3545', fontSize: '14px' }}>
                {t('common.noUpdatePermission')}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default SysProfilePage;
