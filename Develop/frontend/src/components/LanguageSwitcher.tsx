/**
 * 語言切換元件
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/LanguageSwitcher.css';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const currentLanguage = i18n.language;

  return (
    <div className="language-switcher">
      <button
        className={`lang-button ${currentLanguage === 'zh-TW' ? 'active' : ''}`}
        onClick={() => changeLanguage('zh-TW')}
        title="繁體中文"
      >
        繁中
      </button>
      <span className="lang-divider">|</span>
      <button
        className={`lang-button ${currentLanguage === 'en' ? 'active' : ''}`}
        onClick={() => changeLanguage('en')}
        title="English"
      >
        EN
      </button>
    </div>
  );
};

export default LanguageSwitcher;
