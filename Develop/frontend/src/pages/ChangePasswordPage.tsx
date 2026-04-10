/**
 * 密碼變更頁面
 * Change Password Page - Allow users to change their password securely
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTransactionToken } from '../hooks/useTransactionToken';
import { usePermission } from '../hooks/usePermission';
import TransactionExtendDialog from '../components/TransactionExtendDialog';
import FunctionPageHeader from '../components/FunctionPageHeader';
import { logUpdate } from '../utils/userLogHelper';
import { changePassword } from '../services/userService';
import '../styles/ChangePasswordPage.css';

const ChangePasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasInitialized = useRef(false);

  const { hasPermission, loading: permissionLoading } = usePermission();
  const {
    txnToken,
    remainingSeconds,
    showExtendPrompt,
    handleExtendResponse
  } = useTransactionToken('change_password', true, true);

  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });

  // Check permission on mount
  useEffect(() => {
    if (!permissionLoading && !hasPermission('change_password', 'update')) {
      alert(t('common.noPermission', '您沒有權限訪問此頁面'));
      navigate(-1);
    }
  }, [permissionLoading, hasPermission, t, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.newPassword !== formData.confirmPassword) {
      alert(t('changePassword.passwordMismatch', '新密碼與確認密碼不符'));
      return;
    }

    if (formData.newPassword.length < 6) {
      alert(t('changePassword.passwordTooShort', '密碼長度至少需要 6 個字元'));
      return;
    }

    if (formData.newPassword === formData.oldPassword) {
      alert(t('changePassword.samePassword', '新密碼不可與舊密碼相同'));
      return;
    }

    if (!txnToken) {
      alert(t('changePassword.noToken', '請先取得交易令牌'));
      return;
    }

    if (!user?.id) {
      alert(t('changePassword.noUser', '無法取得使用者資訊'));
      return;
    }

    try {
      await changePassword(
        user.id,
        {
          old_password: formData.oldPassword,
          new_password: formData.newPassword
        },
        txnToken
      );

      // Log successful password change (don't log actual passwords)
      await logUpdate(
        'change_password',
        { user_id: user.id, action: 'password_change' },
        { user_id: user.id, action: 'password_changed', timestamp: new Date().toISOString() }
      );

      alert(t('changePassword.success', '密碼變更成功'));

      // Clear form
      setFormData({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Navigate back
      navigate(-1);
    } catch (error: any) {
      console.error('密碼變更失敗:', error);
      const errorMsg = error.response?.data?.detail || error.message || t('changePassword.error', '密碼變更失敗');

      // Log error (don't log actual passwords)
      await logUpdate(
        'change_password',
        { user_id: user.id, action: 'password_change' },
        { user_id: user.id, action: 'password_change_failed', error: errorMsg },
        errorMsg
      );

      alert(errorMsg);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const togglePasswordVisibility = (field: 'old' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  if (permissionLoading) {
    return <div className="loading">{t('common.loading', '載入中...')}</div>;
  }

  return (
    <div className="change-password-page">
      <div className="page-header">
        <FunctionPageHeader funcCode="change_password" />
      </div>

      <div className="password-container">
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <div className="form-row">
              <label>{t('changePassword.oldPassword', '舊密碼')} *</label>
              <div className="password-input-group">
                <input
                  type={showPasswords.old ? 'text' : 'password'}
                  value={formData.oldPassword}
                  onChange={(e) => handleInputChange('oldPassword', e.target.value)}
                  required
                  minLength={6}
                  maxLength={100}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('old')}
                  className="toggle-password"
                >
                  {showPasswords.old ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="form-row">
              <label>{t('changePassword.newPassword', '新密碼')} *</label>
              <div className="password-input-group">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => handleInputChange('newPassword', e.target.value)}
                  required
                  minLength={6}
                  maxLength={100}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('new')}
                  className="toggle-password"
                >
                  {showPasswords.new ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <span className="field-note">
                {t('changePassword.passwordRequirement', '密碼長度至少需要 6 個字元')}
              </span>
            </div>

            <div className="form-row">
              <label>{t('changePassword.confirmPassword', '確認新密碼')} *</label>
              <div className="password-input-group">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  required
                  minLength={6}
                  maxLength={100}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirm')}
                  className="toggle-password"
                >
                  {showPasswords.confirm ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary"
            >
              {t('common.cancel', '取消')}
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!txnToken}
            >
              {t('changePassword.submit', '變更密碼')}
            </button>
          </div>
        </form>

        {!txnToken && (
          <div className="warning-message">
            {t('changePassword.waitingToken', '正在取得交易令牌...')}
          </div>
        )}
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

export default ChangePasswordPage;
