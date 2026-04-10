/**
 * 系統維護頁面
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useSystem } from '../contexts/SystemContext';
import LanguageSwitcher from '../components/LanguageSwitcher';
import '../styles/MaintenancePage.css';

const MaintenancePage: React.FC = () => {
  const { t } = useTranslation();
  const { systemProfile } = useSystem();

  return (
    <div className="maintenance-page">
      <div className="maintenance-lang-switcher">
        <LanguageSwitcher />
      </div>
      <div className="maintenance-container">
        <div className="maintenance-icon">🔧</div>
        <h1 className="maintenance-title">{t('maintenance.title')}</h1>
        <h2 className="maintenance-title-en">{t('maintenance.titleEn')}</h2>
        <p className="maintenance-message">
          {t('maintenance.message')}
        </p>
        <p className="maintenance-message-en">
          {t('maintenance.messageEn')}
        </p>
        <div className="maintenance-info">
          <p>{t('maintenance.apology')}</p>
          <p>{t('maintenance.apologyEn')}</p>
        </div>
        {systemProfile && systemProfile.sys_mana_email && (
          <div className="maintenance-contact">
            <p>{t('maintenance.contact')}</p>
            <p className="contact-email">
              <a href={`mailto:${systemProfile.sys_mana_email}`}>
                {systemProfile.sys_mana_email}
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenancePage;
