/**
 * 系統狀態管理 Context
 * 包含系統設定和語系資訊
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SystemProfile } from '../types';
import { systemService, LicenseInfo } from '../api/systemService';
import { getSysProfile, SysProfile } from '../services/sysProfileService';
import { getI18nValue } from '../utils/i18nHelper';
import axios from '../api/axios';

// 語系選項
export interface LanguageOption {
  code: string;
  cname: string;
  ename: string;
  short_name: string;
}

interface SystemContextType {
  systemProfile: SystemProfile | null;
  sysProfile: SysProfile | null;
  isService: boolean;
  isLoading: boolean;
  refreshSystemProfile: () => Promise<void>;
  getSystemTitle: () => string;
  getCopyright: () => string;
  getLoginBg: () => string;
  getColorTheme: () => string;
  getLayoutMode: () => string; // 'vertical' | 'horizontal'
  // 語系相關
  availableLanguages: LanguageOption[];
  defaultLanguage: string;
  // 系統訊息代碼對應（支援參數替換）
  getMessageByCode: (code: string, params?: Record<string, string>) => string;
  // 授權資訊與功能檢查
  license: LicenseInfo | null;
  hasFeature: (feature: string) => boolean;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

interface SystemProviderProps {
  children: ReactNode;
}

export const SystemProvider: React.FC<SystemProviderProps> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const [systemProfile, setSystemProfile] = useState<SystemProfile | null>(null);
  const [sysProfile, setSysProfile] = useState<SysProfile | null>(null);
  const [isService, setIsService] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // 語系狀態
  const [availableLanguages, setAvailableLanguages] = useState<LanguageOption[]>([]);
  const [defaultLanguage, setDefaultLanguage] = useState<string>('zh-TW');

  // 系統訊息代碼對應表（從 system_codes 的 sys_message_code 載入）
  const [messageCodes, setMessageCodes] = useState<Record<string, string>>({});

  // 授權資訊
  const [license, setLicense] = useState<LicenseInfo | null>(null);

  // 載入系統訊息代碼對應表（公開端點，不需認證）
  const loadMessageCodes = async (lang?: string) => {
    try {
      const currentLang = lang || i18n.language || 'zh-TW';
      const response = await axios.get(`/api/system/message-codes?lang=${currentLang}`);
      setMessageCodes(response.data || {});
    } catch (error) {
      console.error('載入系統訊息代碼對應表失敗:', error);
    }
  };

  // 載入啟用語系（公開端點，不需認證）
  const loadActiveLanguages = async () => {
    try {
      const response = await axios.get('/api/system/languages');
      const data = response.data;
      if (data.languages && Array.isArray(data.languages)) {
        setAvailableLanguages(data.languages);
      }
      if (data.default_language) {
        setDefaultLanguage(data.default_language);
      }
    } catch (error) {
      console.error('載入語系資訊失敗:', error);
      // fallback: 使用預設的 zh-TW 和 en
      setAvailableLanguages([
        { code: 'zh-TW', cname: '繁體中文', ename: 'Traditional Chinese', short_name: '繁中' },
        { code: 'en', cname: '英文', ename: 'English', short_name: 'EN' },
      ]);
    }
  };

  // 載入系統設定
  const loadSystemProfile = async () => {
    setIsLoading(true);
    try {
      // 載入基本系統狀態（不需認證）
      const profile = await systemService.getProfile();
      setSystemProfile(profile);
      setIsService(profile.is_service);

      // 嘗試載入完整的系統設定（需要認證）
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const fullProfile = await getSysProfile();
          setSysProfile(fullProfile);

          // 更新網頁 Title
          const title = getI18nValue(fullProfile.sys_title, i18n.language);
          document.title = title;
        } catch (err) {
          console.error('載入完整系統設定失敗:', err);
        }
      }
    } catch (error: any) {
      console.error('載入系統設定失敗:', error);
      // 只有 API 明確回傳維護狀態才顯示維護頁
      // 網路錯誤（後端暫時不可用）不應顯示維護頁
      if (error?.response?.data?.is_service === false) {
        setIsService(false);
      }
      // 網路錯誤時保留 isService=true（預設值），顯示正常頁面
    } finally {
      setIsLoading(false);
    }
  };

  // 重新載入系統設定
  const refreshSystemProfile = async () => {
    await loadSystemProfile();
    await loadActiveLanguages();
    await loadMessageCodes();
  };

  // 取得系統標題
  const getSystemTitle = (): string => {
    if (!sysProfile) return '';
    return getI18nValue(sysProfile.sys_title, i18n.language);
  };

  // 取得版權宣告
  const getCopyright = (): string => {
    if (!sysProfile) return '';
    return getI18nValue(sysProfile.sys_copyright, i18n.language);
  };

  // 取得登入頁底圖代碼
  const getLoginBg = (): string => {
    return systemProfile?.login_bg || 'default';
  };

  // 取得內頁配色主題
  const getColorTheme = (): string => {
    return systemProfile?.color_theme || 'classic-blue';
  };

  // 取得版面模式（vertical = 直式側邊欄, horizontal = 橫式頂部導覽）
  const getLayoutMode = (): string => {
    return systemProfile?.layout_mode || 'vertical';
  };

  // 取得系統訊息代碼對應的格式化訊息：「系統訊息：(代碼)說明」
  // 支援參數替換：getMessageByCode("SYS100001", { name: "使用者設定" })
  const getMessageByCode = (code: string, params?: Record<string, string>): string => {
    const label = t('common.systemMessage', '系統訊息');
    let description = messageCodes[code] || code;
    // 替換 {參數名} 佔位符
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        description = description.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      });
    }
    return `${label}：(${code})${description}`;
  };

  // 載入授權資訊（公開端點）
  const loadLicense = async () => {
    try {
      const info = await systemService.getLicense();
      setLicense(info);
    } catch (error) {
      console.error('載入授權資訊失敗:', error);
    }
  };

  // 檢查某個 EE 功能是否啟用
  const hasFeature = (feature: string): boolean => {
    return license?.features?.includes(feature) ?? false;
  };

  // 初始化：載入系統設定 + 語系資訊 + 錯誤代碼 + 授權
  useEffect(() => {
    loadSystemProfile();
    loadActiveLanguages();
    loadMessageCodes();
    loadLicense();
  }, []);

  // 套用配色主題到 document
  useEffect(() => {
    const theme = systemProfile?.color_theme || 'classic-blue';
    document.documentElement.setAttribute('data-theme', theme);
  }, [systemProfile]);

  // 監聽語系變更，更新網頁 Title + 重新載入錯誤代碼
  useEffect(() => {
    if (sysProfile) {
      const title = getI18nValue(sysProfile.sys_title, i18n.language);
      document.title = title;
    }
    loadMessageCodes(i18n.language);
  }, [i18n.language, sysProfile]);

  return (
    <SystemContext.Provider
      value={{
        systemProfile,
        sysProfile,
        isService,
        isLoading,
        refreshSystemProfile,
        getSystemTitle,
        getCopyright,
        getLoginBg,
        getColorTheme,
        getLayoutMode,
        availableLanguages,
        defaultLanguage,
        getMessageByCode,
        license,
        hasFeature,
      }}
    >
      {children}
    </SystemContext.Provider>
  );
};

// 自訂 Hook
export const useSystem = () => {
  const context = useContext(SystemContext);
  if (context === undefined) {
    throw new Error('useSystem must be used within a SystemProvider');
  }
  return context;
};
