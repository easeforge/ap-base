/**
 * 系統設定資料頁面
 * 顯示和修改系統設定（id=1）
 * 包含語系設定區塊（checkbox 勾選啟用語系）
 * sys_title, sys_copyright 依啟用語系動態顯示輸入欄位
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
import axios from '../api/axios';
import '../styles/DataTable.css';

// 語系列表項目（來自 sys_languages 資料表）
interface SysLanguageItem {
  id: number;
  lang_code: string;
  lang_cname: string;
  lang_ename: string;
  is_active: boolean;
}

const SysProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { hasPermission, loading: permissionLoading } = usePermission();
  const { refreshSystemProfile } = useSystem();
  const hasInitialized = useRef(false);
  const [profile, setProfile] = useState<SysProfile | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [allLanguages, setAllLanguages] = useState<SysLanguageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<SysProfileUpdate>({});
  const [enabledLangs, setEnabledLangs] = useState<string[]>([]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSysProfile();
      setProfile(data);
      const langs = data.sys_languages || ['zh-TW'];
      setEnabledLangs(langs);
      setFormData({
        is_service: data.is_service,
        sys_url: data.sys_url,
        sys_title: data.sys_title || { 'zh-TW': '' } as I18nField,
        sys_copyright: data.sys_copyright || { 'zh-TW': '' } as I18nField,
        sys_organization: data.sys_organization,
        sys_mana_email: data.sys_mana_email,
        sys_timezone: data.sys_timezone,
        sys_languages: langs,
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

  // 載入所有語系（從 sys_languages 資料表）
  const loadAllLanguages = async () => {
    try {
      const response = await axios.get<SysLanguageItem[]>('/api/sys_languages/');
      setAllLanguages(response.data);
    } catch (err) {
      console.error('Failed to load languages:', err);
    }
  };

  useEffect(() => {
    if (!permissionLoading && hasPermission('sys_profile', 'read') && !hasInitialized.current) {
      hasInitialized.current = true;
      const initPage = async () => {
        try {
          await loadProfile();
          await loadOrganizations();
          await loadAllLanguages();
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

  // 切換語系啟用狀態
  const handleLanguageToggle = (langCode: string, checked: boolean) => {
    let newLangs: string[];
    if (checked) {
      newLangs = [...enabledLangs, langCode];
    } else {
      // 至少保留一個語系
      if (enabledLangs.length <= 1) {
        alert(t('sysProfile.atLeastOneLanguage', '至少需要啟用一個語系'));
        return;
      }
      newLangs = enabledLangs.filter(l => l !== langCode);
    }
    setEnabledLangs(newLangs);
    setFormData({ ...formData, sys_languages: newLangs });
  };

  // 取得語系顯示名稱
  const getLangDisplayName = (lang: SysLanguageItem) => {
    const isZh = i18n.language === 'zh-TW';
    return isZh
      ? `${lang.lang_cname} (${lang.lang_code})`
      : `${lang.lang_ename} (${lang.lang_code})`;
  };

  // 取得語系標籤（用於 input label）
  const getLangLabel = (langCode: string) => {
    const lang = allLanguages.find(l => l.lang_code === langCode);
    if (!lang) return langCode;
    const isZh = i18n.language === 'zh-TW';
    return isZh ? lang.lang_cname : lang.lang_ename;
  };

  // 更新多語系欄位的值
  const updateI18nField = (
    fieldName: 'sys_title' | 'sys_copyright',
    langCode: string,
    value: string
  ) => {
    const currentField = (formData[fieldName] as I18nField) || {};
    setFormData({
      ...formData,
      [fieldName]: { ...currentField, [langCode]: value }
    });
  };

  // 語系翻譯同步補足
  const handleSyncTranslations = async () => {
    try {
      setSyncing(true);
      const response = await axios.post('/api/sys_languages/sync-translations');
      const data = response.data;
      const details = Object.entries(data.details || {})
        .map(([lang, info]: [string, any]) => `${lang}: +${info.added} (${t('sysProfile.syncTotal', '共')} ${info.total})`)
        .join('\n');
      alert(`${data.message}\n\n${details}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || t('message.saveFailed'));
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      const updated = await updateSysProfile(formData);
      await logUpdate('sys_profile', profile as any, updated as any);

      // 重新載入頁面資料
      loadProfile();

      // 重新載入全域系統設定（立即更新 Title、版權宣告和語系切換器）
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

  const canUpdate = hasPermission('sys_profile', 'update');
  const titleField = (formData.sys_title as I18nField) || {};
  const copyrightField = (formData.sys_copyright as I18nField) || {};

  return (
    <div className="page-container">
      <div className="page-header">
        <FunctionPageHeader funcCode="sys_profile" />
      </div>

      <div className="data-table-container">
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div className="form-grid">
            {/* 系統服務狀態 */}
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

            {/* 系統網址 */}
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

            {/* 語系設定區塊 */}
            <div className="form-group full-width" style={{
              background: '#f8f9fa',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              padding: '16px'
            }}>
              <label style={{ fontWeight: 600, fontSize: '15px', marginBottom: '12px', display: 'block' }}>
                {t('sysProfile.languageSettings', '語系設定')}
              </label>
              <p style={{ fontSize: '13px', color: '#6c757d', marginBottom: '12px' }}>
                {t('sysProfile.languageSettingsHint', '勾選要啟用的語系，系統標題和版權宣告將依啟用語系提供多語系輸入欄位')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                {allLanguages
                  .filter(lang => lang.is_active)
                  .map((lang) => (
                    <label key={lang.lang_code} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: enabledLangs.includes(lang.lang_code) ? '#e8f5e9' : '#fff',
                      border: `1px solid ${enabledLangs.includes(lang.lang_code) ? '#81c784' : '#dee2e6'}`,
                      cursor: canUpdate ? 'pointer' : 'default',
                    }}>
                      <input
                        type="checkbox"
                        checked={enabledLangs.includes(lang.lang_code)}
                        onChange={(e) => handleLanguageToggle(lang.lang_code, e.target.checked)}
                        disabled={!canUpdate}
                      />
                      <span style={{ fontWeight: 500 }}>{getLangDisplayName(lang)}</span>
                    </label>
                  ))}
              </div>
              {allLanguages.filter(l => l.is_active).length === 0 && (
                <p style={{ color: '#999', fontStyle: 'italic' }}>
                  {t('sysProfile.noLanguagesAvailable', '尚未建立語系資料')}
                </p>
              )}
              {canUpdate && enabledLangs.length > 1 && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #dee2e6' }}>
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={syncing}
                    onClick={handleSyncTranslations}
                    style={{ padding: '6px 16px', fontSize: '13px' }}
                  >
                    {syncing
                      ? t('sysProfile.syncing', '同步中...')
                      : t('sysProfile.syncTranslations', '語系翻譯同步補足')}
                  </button>
                  <span style={{ marginLeft: '10px', fontSize: '12px', color: '#6c757d' }}>
                    {t('sysProfile.syncTranslationsHint', '自動掃描並補足各語系缺少的翻譯 key')}
                  </span>
                </div>
              )}
            </div>

            {/* 系統標題 - 依啟用語系動態顯示 */}
            <div className="form-group full-width">
              <label style={{ fontWeight: 600, fontSize: '15px', marginBottom: '8px', display: 'block' }}>
                {t('sysProfile.sysTitle', '系統標題')} *
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {enabledLangs.map((langCode) => (
                  <div key={`title-${langCode}`} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      minWidth: '100px',
                      fontSize: '13px',
                      color: '#495057',
                      fontWeight: 500,
                    }}>
                      {getLangLabel(langCode)} ({langCode})
                    </span>
                    <input
                      type="text"
                      value={titleField[langCode] || ''}
                      onChange={(e) => updateI18nField('sys_title', langCode, e.target.value)}
                      required
                      disabled={!canUpdate}
                      style={{ flex: 1 }}
                      placeholder={`${t('sysProfile.sysTitle', '系統標題')} - ${langCode}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 版權宣告 - 依啟用語系動態顯示 */}
            <div className="form-group full-width">
              <label style={{ fontWeight: 600, fontSize: '15px', marginBottom: '8px', display: 'block' }}>
                {t('sysProfile.sysCopyright', '版權宣告')} *
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {enabledLangs.map((langCode) => (
                  <div key={`copyright-${langCode}`} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      minWidth: '100px',
                      fontSize: '13px',
                      color: '#495057',
                      fontWeight: 500,
                    }}>
                      {getLangLabel(langCode)} ({langCode})
                    </span>
                    <input
                      type="text"
                      value={copyrightField[langCode] || ''}
                      onChange={(e) => updateI18nField('sys_copyright', langCode, e.target.value)}
                      required
                      disabled={!canUpdate}
                      style={{ flex: 1 }}
                      placeholder={`${t('sysProfile.sysCopyright', '版權宣告')} - ${langCode}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* 所屬組織 */}
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

            {/* 管理員信箱 */}
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

            {/* 系統時區 */}
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
