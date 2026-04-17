/**
 * 個人資料變更頁面
 * My Profile Page - Allow users to view and update their own profile
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { usePermission } from '../hooks/usePermission';
import { useTransactionToken } from '../hooks/useTransactionToken';
import { useMessage } from '../contexts/MessageContext';
import TransactionExtendDialog from '../components/TransactionExtendDialog';
import FunctionPageHeader from '../components/FunctionPageHeader';
import { logRead, logUpdate } from '../utils/userLogHelper';
import { getMyProfile, updateMyProfile } from '../services/userService';
import { UserDetail } from '../services/userService';
import { getOrganization } from '../services/organizationService';
import '../styles/MyProfilePage.css';

const MyProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showSuccess, showError, showApiError } = useMessage();
  const hasInitialized = useRef(false);

  const { hasPermission, loading: permissionLoading } = usePermission();
  const {
    txnToken,
    remainingSeconds,
    showExtendPrompt,
    handleExtendResponse,
    requestToken
  } = useTransactionToken('my_profile', false, true);

  const [profile, setProfile] = useState<UserDetail | null>(null);
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isRequestingToken, setIsRequestingToken] = useState(false);
  const [formData, setFormData] = useState({
    account: '',
    username: '',
    department: '',
    job_title: '',
    phone: ''
  });

  // Load profile on mount
  useEffect(() => {
    if (!permissionLoading && hasPermission('my_profile', 'read') && !hasInitialized.current) {
      hasInitialized.current = true;
      loadProfile();
    }
  }, [permissionLoading, hasPermission]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getMyProfile();
      setProfile(data);
      setFormData({
        account: data.account || '',
        username: data.username || '',
        department: data.department || '',
        job_title: data.job_title || '',
        phone: data.phone || ''
      });

      // 載入組織名稱
      if (data.organization_id) {
        try {
          const org = await getOrganization(data.organization_id);
          setOrgName(org.org_name || String(data.organization_id));
        } catch {
          setOrgName(String(data.organization_id));
        }
      }

      // Log view
      await logRead('my_profile', data);
    } catch (error: any) {
      console.error('載入個人資料失敗:', error);
      showApiError(error, 'ERR020004', { operation: '載入個人資料', detail: error?.message || '' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    try {
      setIsRequestingToken(true);
      // Request transaction token first before entering edit mode
      await requestToken();

      // Wait a bit to ensure token is set
      await new Promise(resolve => setTimeout(resolve, 100));

      // Only enter edit mode after token is ready
      setIsEditMode(true);
    } catch (error) {
      console.error('取得交易令牌失敗:', error);
      showError('ERR020001', { entity: '交易令牌' });
    } finally {
      setIsRequestingToken(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (profile) {
      setFormData({
        account: profile.account || '',
        username: profile.username || '',
        department: profile.department || '',
        job_title: profile.job_title || '',
        phone: profile.phone || ''
      });
    }
    setIsEditMode(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!txnToken) {
      showError('ERR020001', { entity: '交易令牌' });
      return;
    }

    try {
      const originalData = profile;
      const updatedProfile = await updateMyProfile(formData, txnToken);
      setProfile(updatedProfile);
      setIsEditMode(false);

      // Log update
      await logUpdate('my_profile', originalData as any, updatedProfile as any);

      showSuccess('SYS100001');
    } catch (error: any) {
      console.error('更新個人資料失敗:', error);
      const errorMsg = error.response?.data?.detail || error.message || t('myProfile.updateError', '更新個人資料失敗');

      // Log error
      await logUpdate('my_profile', profile as any, formData, errorMsg);

      showApiError(error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (permissionLoading || loading) {
    return <div className="loading">{t('common.loading', '載入中...')}</div>;
  }

  if (!hasPermission('my_profile', 'read')) {
    return (
      <div className="no-permission">
        {t('common.noPermission', '您沒有權限訪問此頁面')}
      </div>
    );
  }

  const canUpdate = hasPermission('my_profile', 'update');

  return (
    <div className="my-profile-page">
      <div className="page-header">
        <FunctionPageHeader funcCode="my_profile" />
      </div>

      <div className="profile-container">
        <form onSubmit={handleSubmit}>
          {/* Read-only fields */}
          <div className="form-section">
            <h3>{t('myProfile.accountInfo', '帳號資訊')}</h3>

            <div className="form-row">
              <label>{t('myProfile.organization', '組織')}</label>
              <input
                type="text"
                value={orgName || profile?.organization_id || ''}
                disabled
                className="readonly-input"
              />
              <span className="field-note">{t('myProfile.organizationNote', '組織無法變更')}</span>
            </div>
          </div>

          {/* Editable fields */}
          <div className="form-section">
            <h3>{t('myProfile.personalInfo', '個人資訊')}</h3>

            <div className="form-row">
              <label>{t('myProfile.account', '帳號')} *</label>
              <input
                type="text"
                value={formData.account}
                onChange={(e) => handleInputChange('account', e.target.value)}
                disabled={!isEditMode}
                required
                maxLength={100}
              />
              <span className="field-note">{t('myProfile.accountNote', '帳號必須唯一')}</span>
            </div>

            <div className="form-row">
              <label>{t('myProfile.username', '使用者名稱')} *</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                disabled={!isEditMode}
                required
                maxLength={200}
              />
            </div>

            <div className="form-row">
              <label>{t('myProfile.department', '部門')}</label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                disabled={!isEditMode}
                maxLength={200}
              />
            </div>

            <div className="form-row">
              <label>{t('myProfile.jobTitle', '職稱')}</label>
              <input
                type="text"
                value={formData.job_title}
                onChange={(e) => handleInputChange('job_title', e.target.value)}
                disabled={!isEditMode}
                maxLength={200}
              />
            </div>

            <div className="form-row">
              <label>{t('myProfile.phone', '電話')}</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={!isEditMode}
                maxLength={200}
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="form-actions">
            {!isEditMode ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="btn-secondary"
                >
                  {t('common.back', '返回')}
                </button>
                {canUpdate && (
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="btn-primary"
                    disabled={isRequestingToken}
                  >
                    {isRequestingToken ? t('common.loading', '處理中...') : t('common.edit', '編輯')}
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn-secondary"
                >
                  {t('common.cancel', '取消')}
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!txnToken}
                >
                  {t('common.save', '儲存')}
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* Transaction Extend Dialog */}
      <TransactionExtendDialog
        open={showExtendPrompt}
        remainingSeconds={remainingSeconds}
        onExtend={() => handleExtendResponse(true)}
        onCancel={() => handleExtendResponse(false)}
      />
    </div>
  );
};

export default MyProfilePage;
