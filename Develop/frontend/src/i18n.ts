/**
 * i18n 多語系配置
 * 支援動態載入語系：先從 API 載入，失敗則 fallback 到靜態檔案
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';

// 靜態匯入作為 fallback（確保離線或 API 不可用時仍可使用）
import translationZhTW from './locales/zh-TW/translation.json';
import translationEn from './locales/en/translation.json';

const fallbackResources: Record<string, any> = {
  'zh-TW': translationZhTW,
  'en': translationEn,
};

i18n
  // 使用 HTTP 後端動態載入語系檔
  .use(HttpBackend)
  // 偵測使用者語言
  .use(LanguageDetector)
  // 將 i18n 實例傳遞給 react-i18next
  .use(initReactI18next)
  // 初始化 i18next
  .init({
    fallbackLng: 'zh-TW',
    lng: localStorage.getItem('i18nextLng') || 'zh-TW',
    debug: false,

    // 語言偵測選項
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false, // React 已經處理 XSS
    },

    // 命名空間
    ns: ['translation'],
    defaultNS: 'translation',

    // 不限制 supportedLngs，讓動態語系也能載入
    // supportedLngs 會在 SystemContext 載入後由 LanguageSwitcher 控制可選語系

    // HTTP 後端設定
    backend: {
      // 從後端 API 載入語系翻譯資料
      loadPath: '/api/sys_languages/{{lng}}',

      // 自訂解析：API 回傳的是 SysLanguageResponse，翻譯資料在 lang_data 欄位
      parse: (data: string) => {
        try {
          const parsed = JSON.parse(data);
          // API 回傳格式: { id, lang_code, lang_cname, lang_ename, lang_data: {...}, is_active, ... }
          if (parsed.lang_data && typeof parsed.lang_data === 'object') {
            return parsed.lang_data;
          }
          // 如果直接是翻譯資料格式
          return parsed;
        } catch {
          return {};
        }
      },

      // 請求設定：帶入 auth token（因為 /api/sys_languages 需要認證）
      requestOptions: {
        cache: 'no-store',
      },
      customHeaders: () => {
        const token = localStorage.getItem('access_token');
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    },

    // 當 HTTP 後端載入失敗時，使用靜態 fallback
    partialBundledLanguages: true,
    resources: {
      'zh-TW': { translation: fallbackResources['zh-TW'] },
      'en': { translation: fallbackResources['en'] },
    },
  });

export default i18n;
