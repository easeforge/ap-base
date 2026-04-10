/**
 * i18n 多語系配置
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 匯入語系檔案
import translationZhTW from './locales/zh-TW/translation.json';
import translationEn from './locales/en/translation.json';

// 語系資源
const resources = {
  'zh-TW': {
    translation: translationZhTW,
  },
  en: {
    translation: translationEn,
  },
};

i18n
  // 偵測使用者語言
  .use(LanguageDetector)
  // 將 i18n 實例傳遞給 react-i18next
  .use(initReactI18next)
  // 初始化 i18next
  .init({
    resources,
    fallbackLng: 'zh-TW', // 預設語言
    lng: 'zh-TW', // 初始語言
    debug: false, // 開發模式下可設為 true

    // 語言偵測選項
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false, // React 已經處理 XSS
    },

    // 支援的語言
    supportedLngs: ['zh-TW', 'en'],

    // 命名空間
    ns: ['translation'],
    defaultNS: 'translation',
  });

export default i18n;
