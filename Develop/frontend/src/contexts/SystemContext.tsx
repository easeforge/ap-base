/**
 * 系統狀態管理 Context
 * 包含系統設定和語系資訊
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SystemProfile } from '../types';
import { systemService } from '../api/systemService';
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
  // 語系相關
  availableLanguages: LanguageOption[];
  defaultLanguage: string;
}

const SystemContext = createContext<SystemContextType | undefined>(undefined);

interface SystemProviderProps {
  children: ReactNode;
}

export const SystemProvider: React.FC<SystemProviderProps> = ({ children }) => {
  const { i18n } = useTranslation();
  const [systemProfile, setSystemProfile] = useState<SystemProfile | null>(null);
  const [sysProfile, setSysProfile] = useState<SysProfile | null>(null);
  const [isService, setIsService] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // 語系狀態
  const [availableLanguages, setAvailableLanguages] = useState<LanguageOption[]>([]);
  const [defaultLanguage, setDefaultLanguage] = useState<string>('zh-TW');

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
    } catch (error) {
      console.error('載入系統設定失敗:', error);
      setIsService(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 重新載入系統設定
  const refreshSystemProfile = async () => {
    await loadSystemProfile();
    await loadActiveLanguages();
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

  // 初始化：載入系統設定 + 語系資訊
  useEffect(() => {
    loadSystemProfile();
    loadActiveLanguages();
  }, []);

  // 監聽語系變更，更新網頁 Title
  useEffect(() => {
    if (sysProfile) {
      const title = getI18nValue(sysProfile.sys_title, i18n.language);
      document.title = title;
    }
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
        availableLanguages,
        defaultLanguage,
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
