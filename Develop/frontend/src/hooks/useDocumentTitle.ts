/**
 * 自訂 Hook - 更新網頁 title
 * 根據語言和系統設定動態更新
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSystem } from '../contexts/SystemContext';

export const useDocumentTitle = () => {
  const { i18n } = useTranslation();
  const { systemProfile } = useSystem();

  useEffect(() => {
    // 根據當前語言選擇對應的標題
    const updateTitle = () => {
      if (systemProfile) {
        const title = i18n.language === 'en'
          ? systemProfile.sys_etitle
          : systemProfile.sys_ctitle;

        document.title = title || 'PA6.4 Management System';
      } else {
        // 如果還沒載入系統設定，使用預設值
        document.title = i18n.language === 'en'
          ? 'Paris Agreement Article 6.4 Management System'
          : 'Paris Agreement Article 6.4 管理系統';
      }
    };

    // 初始更新
    updateTitle();

    // 監聽語言變更事件
    i18n.on('languageChanged', updateTitle);

    // 清理函式
    return () => {
      i18n.off('languageChanged', updateTitle);
    };
  }, [i18n, systemProfile]);
};
