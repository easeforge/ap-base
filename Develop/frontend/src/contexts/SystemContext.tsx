/**
 * 系統狀態管理 Context
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SystemProfile } from '../types';
import { systemService } from '../api/systemService';
import { getSysProfile, SysProfile } from '../services/sysProfileService';

interface SystemContextType {
  systemProfile: SystemProfile | null;
  sysProfile: SysProfile | null;
  isService: boolean;
  isLoading: boolean;
  refreshSystemProfile: () => Promise<void>;
  getSystemTitle: () => string;
  getCopyright: () => string;
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

  // 載入系統設定
  const loadSystemProfile = async () => {
    setIsLoading(true);
    try {
      // 載入基本系統狀態（不需認證）
      const profile = await systemService.getProfile();
      setSystemProfile(profile);
      setIsService(profile.is_service);

      // 嘗試載入完整的系統設定（需要認證）
      // 只有在有 token 時才載入
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const fullProfile = await getSysProfile();
          setSysProfile(fullProfile);

          // 更新網頁 Title
          const title = i18n.language === 'zh-TW' ? fullProfile.sys_ctitle : fullProfile.sys_etitle;
          document.title = title;
        } catch (err) {
          console.error('載入完整系統設定失敗:', err);
          // 這裡不應該影響 isService 狀態
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
  };

  // 取得系統標題
  const getSystemTitle = (): string => {
    if (!sysProfile) return '';
    return i18n.language === 'zh-TW' ? sysProfile.sys_ctitle : sysProfile.sys_etitle;
  };

  // 取得版權宣告
  const getCopyright = (): string => {
    if (!sysProfile) return '';
    return i18n.language === 'zh-TW' ? sysProfile.sys_ccopyright : sysProfile.sys_ecopyright;
  };

  // 初始化載入系統設定
  useEffect(() => {
    loadSystemProfile();
  }, []);

  // 監聽語系變更，更新網頁 Title
  useEffect(() => {
    if (sysProfile) {
      const title = i18n.language === 'zh-TW' ? sysProfile.sys_ctitle : sysProfile.sys_etitle;
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
