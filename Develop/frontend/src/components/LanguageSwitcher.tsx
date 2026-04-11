/**
 * 語言切換元件
 * 從 SystemContext 取得可用語系，1 個不顯示，2 個以上顯示切換器
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSystem } from '../contexts/SystemContext';
import '../styles/LanguageSwitcher.css';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const { availableLanguages } = useSystem();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // 只有 1 個語系時不顯示切換器
  if (availableLanguages.length <= 1) {
    return null;
  }

  // 2 個語系時使用按鈕切換樣式
  if (availableLanguages.length === 2) {
    return (
      <div className="language-switcher">
        {availableLanguages.map((lang, index) => (
          <React.Fragment key={lang.code}>
            {index > 0 && <span className="lang-divider">|</span>}
            <button
              className={`lang-button ${i18n.language === lang.code ? 'active' : ''}`}
              onClick={() => changeLanguage(lang.code)}
              title={lang.ename}
            >
              {lang.short_name || lang.code}
            </button>
          </React.Fragment>
        ))}
      </div>
    );
  }

  // 3 個以上語系時使用下拉選單
  return (
    <div className="language-switcher">
      <select
        className="lang-select"
        value={i18n.language}
        onChange={(e) => changeLanguage(e.target.value)}
      >
        {availableLanguages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.short_name || lang.code} - {lang.ename}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSwitcher;
