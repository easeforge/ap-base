/**
 * 登入頁面
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useSystem } from '../contexts/SystemContext';
import { authService } from '../api/authService';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { getI18nValue } from '../utils/i18nHelper';
import loginBgDefault from '../assets/images/login-bg.jpg';
import loginBg1 from '../assets/images/login-bg-1.jpg';
import loginBg2 from '../assets/images/login-bg-2.jpg';
import '../styles/LoginPage.css';

const LOGIN_BG_MAP: Record<string, string> = {
  default: loginBgDefault,
  nature: loginBg1,
  landscape: loginBg2,
};

const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { login } = useAuth();
  const { systemProfile, getLoginBg, getMessageByCode } = useSystem();
  const bgImage = LOGIN_BG_MAP[getLoginBg()] || LOGIN_BG_MAP['default'];

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
  // 從 URL 帶入的訊息代碼（等 messageCodes 載入後再翻譯）
  const [pendingMsgCode, setPendingMsgCode] = useState<string | null>(null);
  const [pendingMsgParams, setPendingMsgParams] = useState<Record<string, string> | undefined>(undefined);

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

  // 從 URL ?msg=代碼&p=參數JSON 取出待顯示的訊息代碼（只執行一次）
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const msgCode = search.get('msg');
    const msgParamsStr = search.get('p');
    if (msgCode) {
      setPendingMsgCode(msgCode);
      if (msgParamsStr) {
        try {
          setPendingMsgParams(JSON.parse(msgParamsStr));
        } catch {
          // 解析失敗忽略
        }
      }
      // 清除 URL 上的參數，避免重整時重覆顯示
      window.history.replaceState({}, '', '/login');
    }
  }, []);

  // 當 messageCodes 載入完成（getMessageByCode 更新）後，翻譯待顯示的代碼
  useEffect(() => {
    if (pendingMsgCode) {
      setError(getMessageByCode(pendingMsgCode, pendingMsgParams));
    }
  }, [pendingMsgCode, pendingMsgParams, getMessageByCode]);

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
      const response = await authService.login({
        ...formData,
        captcha_key: captchaKey,
      });

      // 儲存 token 後全頁重載
      authService.saveToken(response.access_token);
      window.location.href = '/home';
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      // detail 可能是字串（純代碼）或物件（{code, params}）
      if (typeof detail === 'string') {
        setError(getMessageByCode(detail));
      } else if (detail && typeof detail === 'object' && detail.code) {
        setError(getMessageByCode(detail.code, detail.params));
      } else if (err.message) {
        setError(err.message);
      } else {
        setError(t('auth.loginFailed'));
      }
      loadCaptcha();
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page" style={{ '--login-bg-image': `url(${bgImage})` } as React.CSSProperties}>
      <div className="login-container">
        <div className="header-lang-switcher">
          <LanguageSwitcher />
        </div>

        <div className="login-header">
          <h1 className={`system-title ${i18n.language === 'en' ? 'lang-en' : 'lang-zh'}`}>
            {getI18nValue(systemProfile?.sys_title, i18n.language, 'Base AP Management System')}
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
            {getI18nValue(systemProfile?.sys_copyright, i18n.language, t('common.copyright'))}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
