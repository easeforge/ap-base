/**
 * 自訂 Hook - 更新網頁 title
 * 根據語言和系統設定動態更新
 */

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSystem } from '../contexts/SystemContext';
import { getI18nValue } from '../utils/i18nHelper';

export const useDocumentTitle = () => {
  const { i18n } = useTranslation();
  const { systemProfile } = useSystem();

  useEffect(() => {
    // 根據當前語言選擇對應的標題
    const updateTitle = () => {
      if (systemProfile) {
        const title = getI18nValue(systemProfile.sys_title, i18n.language);
        document.title = title || 'Base AP Management System';
      } else {
        document.title = i18n.language === 'en'
          ? 'Base AP Management System'
          : '後臺管理基底平台';
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
