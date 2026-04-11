/**
 * 登入頁面
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSystem } from '../contexts/SystemContext';
import { authService } from '../api/authService';
import LanguageSwitcher from '../components/LanguageSwitcher';
import '../styles/LoginPage.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const { systemProfile } = useSystem();

  const [formData, setFormData] = useState({
    account: '',
    password: '',
    captcha_code: '',
  });
  const [captchaKey, setCaptchaKey] = useState('');
  const [captchaSvg, setCaptchaSvg] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const loadCaptcha = useCallback(async () => {
    try {
      const data = await authService.getCaptcha();
      setCaptchaKey(data.captcha_key);
      setCaptchaSvg(data.captcha_svg);
      setFormData(prev => ({ ...prev, captcha_code: '' }));
    } catch (err) {
      console.error('Failed to load CAPTCHA:', err);
    }
  }, []);

  useEffect(() => {
    loadCaptcha();
  }, [loadCaptcha]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // 呼叫登入 API（含 CAPTCHA）
      const response = await authService.login({
        ...formData,
        captcha_key: captchaKey,
      });
      // 儲存 Access Token
      authService.saveToken(response.access_token);

      // 載入使用者資料
      await login(response.access_token);

      // 導向主頁面
      navigate('/dashboard');
    } catch (err: any) {
      console.error('登入失敗:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError(t('auth.loginFailed'));
      }
      // 登入失敗時刷新驗證碼
      loadCaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="header-lang-switcher">
          <LanguageSwitcher />
        </div>

        <div className="login-header">
          <h1 className={`system-title ${i18n.language === 'en' ? 'lang-en' : 'lang-zh'}`}>
            {i18n.language === 'en'
              ? (systemProfile?.sys_etitle || 'Paris Agreement Article 6.4 Management System')
              : (systemProfile?.sys_ctitle || '巴黎協定 減碳活動申請系統')}
          </h1>
        </div>

        <div className="login-form-container">
          <h3 className="login-form-title">{t('auth.login')}</h3>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="account">{t('auth.account', '帳號')}</label>
              <input
                type="text"
                id="account"
                name="account"
                value={formData.account}
                onChange={handleChange}
                placeholder={t('auth.accountPlaceholder', '請輸入帳號')}
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">{t('auth.password')}</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder={t('auth.passwordPlaceholder')}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>{t('auth.captcha')}</label>
              <div className="captcha-row">
                <input
                  type="text"
                  name="captcha_code"
                  value={formData.captcha_code}
                  onChange={handleChange}
                  placeholder={t('auth.captchaPlaceholder')}
                  required
                  disabled={isLoading}
                  autoComplete="off"
                  maxLength={4}
                  className="captcha-input"
                />
                <div
                  className="captcha-image"
                  dangerouslySetInnerHTML={{ __html: captchaSvg }}
                  onClick={loadCaptcha}
                  title={t('auth.refreshCaptcha')}
                />
              </div>
            </div>

            {error && (
              <div className="error-message">
                <span>⚠️</span> {error}
              </div>
            )}

            <button
              type="submit"
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? t('auth.loggingIn') : t('auth.loginButton')}
            </button>
          </form>
        </div>

        <div className="login-footer">
          <p>
            <img src="/logo.png" alt="Logo" className="login-logo" />
            {i18n.language === 'en'
              ? (systemProfile?.sys_ecopyright || 'Copyright © 2026 JiangYun Co., Ltd.')
              : (systemProfile?.sys_ccopyright || t('common.copyright'))}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
